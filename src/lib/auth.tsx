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
  const [loading, setLoading] = useState(true); // Start as true, and only set to false once auth is confirmed.
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
        // This is a critical error, sign out to prevent being stuck.
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
  }, []);

  useEffect(() => {
    const handleAuthStateChange = async (session: Session | null) => {
        const supabaseUser = session?.user ?? null;
        if (supabaseUser) {
            const profile = await fetchUserProfile(supabaseUser);
            setUser(profile);
        } else {
            setUser(null);
        }
        // Crucially, set loading to false only after all async logic is complete.
        setLoading(false);
    };

    // First, get the initial session on component mount.
    supabase.auth.getSession().then(({ data: { session } }) => {
        handleAuthStateChange(session);
    });

    // Then, subscribe to any subsequent auth state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        // We only update the user state if it has actually changed to avoid unnecessary re-renders.
        const newAuthId = session?.user?.id;
        const currentAuthId = user?.auth_id;
        
        if (newAuthId !== currentAuthId) {
             handleAuthStateChange(session);
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, user?.auth_id]);


  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    // Don't need to manually set loading false, auth listener will do it.
    router.push('/login'); 
  };
  
  const value = { user, loading, logout };

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
