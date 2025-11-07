
"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User, UserRole } from './types';
import { supabase } from './supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  sessionRefreshed: boolean;
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
    if (!supabaseUser) return null;

    try {
        const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', supabaseUser.id)
            .single();

        if (error) {
            console.error("Error fetching user profile:", error);
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
        console.error("Exception fetching user profile:", e);
        return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    async function handleAuthStateChange(event: AuthChangeEvent, session: Session | null) {
        if (!isMounted) return;

        const supabaseUser = session?.user ?? null;
        const profile = await fetchUserProfile(supabaseUser);

        if (isMounted) {
            setUser(profile);
            setLoading(false);
             // This is the key change: ensure sessionRefreshed is true after first check.
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
                setSessionRefreshed(true);
            }
        }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    
    return () => {
        isMounted = false;
        subscription.unsubscribe();
    };
  }, [fetchUserProfile]);


  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSessionRefreshed(false);
    router.push('/login');
  };
  
  const value = { user, loading, logout, sessionRefreshed };

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
