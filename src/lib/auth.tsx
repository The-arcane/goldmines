
"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User, UserRole } from './types';
import { supabase } from './supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionRefreshed: boolean; // New state to track if session has been checked at least once
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionRefreshed, setSessionRefreshed] = useState(false);
  const router = useRouter();

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser | null): Promise<User | null> => {
    if (!supabaseUser) {
        return null;
    }

    try {
        const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', supabaseUser.id)
            .single();
        
        if (error) {
            console.error("Error fetching user profile:", error);
            await supabase.auth.signOut();
            return null;
        }

        return {
            id: profile.id,
            auth_id: supabaseUser.id,
            name: profile.name,
            email: profile.email,
            role: mapNumericRoleToString(profile.role),
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
        };
    } catch (e) {
        console.error("Exception in fetchUserProfile:", e);
        return null;
    }
  }, []);

  useEffect(() => {
    const handleAuthStateChange = async (_event: AuthChangeEvent, session: Session | null) => {
        setLoading(true);
        const supabaseUser = session?.user ?? null;
        if (supabaseUser) {
            const profile = await fetchUserProfile(supabaseUser);
            setUser(profile);
        } else {
            setUser(null);
        }
        setSessionRefreshed(true); // Mark session as checked
        setLoading(false);
    };
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    
    // Initial check in case onAuthStateChange doesn't fire on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!sessionRefreshed) {
             handleAuthStateChange('INITIAL_SESSION', session);
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, sessionRefreshed]);


  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login'); 
    setLoading(false);
  };
  
  const value = { user, loading, sessionRefreshed, logout };

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
