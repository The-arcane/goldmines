
"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User, UserRole } from './types';
import { supabase } from './supabaseClient';
import type { AuthChangeEvent, Session as SupabaseSession } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Define a more specific type for the context value
interface AuthContextType {
  session: SupabaseSession | null;
  user: User | null; 
  loading: boolean;
  logout: () => Promise<void>;
  refetchKey: number; // Add a key to trigger refetches
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchKey, setRefetchKey] = useState(0);
  const router = useRouter();

  const loadSession = useCallback(async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const currentSession = sessionData?.session ?? null;
      setSession(currentSession);

      if (currentSession) {
        const { data: profileData } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", currentSession.user.id)
          .single();
        
        if (profileData) {
          setUser(profileData as User);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
  }, []);

  useEffect(() => {
    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: SupabaseSession | null) => {
        setLoading(true);
        loadSession().then(() => {
            // After auth state changes, increment key to trigger refetches in components
            setRefetchKey(prev => prev + 1);
        });
      }
    );
    
    return () => listener.subscription.unsubscribe();
  }, [loadSession]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    router.push('/login');
  };

  const value = { session, user, loading, logout, refetchKey };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
