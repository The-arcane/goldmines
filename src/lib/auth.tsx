
"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, UserRole } from './types';
import { supabase } from './supabaseClient';
import type { AuthChangeEvent, Session as SupabaseSession } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Define a more specific type for the context value
interface AuthContextType {
  session: SupabaseSession | null;
  user: User | null; // Changed from profile to user to match existing usage
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapNumericRoleToString = (role: number): UserRole => {
    const roleMap: { [key: number]: UserRole } = {
        1: 'admin',
        2: 'sales_executive',
        3: 'distributor_admin',
        4: 'delivery_partner',
    };
    return roleMap[role] || 'sales_executive'; // Fallback role
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<User | null>(null); // Changed from profile to user
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadSession() {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData?.session ?? null;
      setSession(currentSession);

      if (currentSession) {
        const { data: profileData } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", currentSession.user.id)
          .single();
        
        if (profileData) {
          setUser({
              id: profileData.id,
              auth_id: profileData.auth_id,
              name: profileData.name,
              email: profileData.email,
              role: mapNumericRoleToString(profileData.role),
              avatar_url: profileData.avatar_url,
              created_at: profileData.created_at,
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    
    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: SupabaseSession | null) => {
        setLoading(true);
        loadSession();
      }
    );
    
    return () => listener.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    router.push('/login');
  };

  const value = { session, user, loading, logout };

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
