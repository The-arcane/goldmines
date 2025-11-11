
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
  refetchKey: number; // Keep for components that already use it, but central logic is removed.
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
  const [refetchKey, setRefetchKey] = useState(0); // This can still be used for manual refreshes if needed.
  const router = useRouter();

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser | null): Promise<User | null> => {
    if (!supabaseUser) {
        return null;
    }
    const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', supabaseUser.id)
        .single();
    
    if (error) {
        console.error("Error fetching user profile:", error);
        // Don't sign out here, as it might be a temporary network issue.
        // Let the UI handle the "no profile" case.
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
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const supabaseUser = session?.user ?? null;
        const profile = await fetchUserProfile(supabaseUser);
        setUser(profile);
        setLoading(false);

        // This is a good place to trigger a refetch after auth state is confirmed.
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setRefetchKey(prev => prev + 1);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);


  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    setUser(null);
  };
  
  const value = { user, loading, logout, refetchKey };

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
