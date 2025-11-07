
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
  // sessionRefreshed is now implicitly handled by the `loading` state.
  // When loading is false, the session is considered refreshed and settled.
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
  const [loading, setLoading] = useState(true); // Start as true
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
            // If profile not found, it might be a transient issue or a real problem.
            // Sign out to prevent being stuck in a logged-in-but-no-profile state.
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
        console.error("Exception fetching user profile:", e);
        return null;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setLoading(true);
        const supabaseUser = session?.user ?? null;
        if (supabaseUser) {
            const profile = await fetchUserProfile(supabaseUser);
            setUser(profile);
        } else {
            setUser(null);
        }
        // Only set loading to false after all async operations are done.
        setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);


  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    setLoading(false);
  };
  
  const value = { user, loading, logout };

  // Render children only when loading is false. This prevents rendering with incomplete auth state.
  // The loading spinner is handled by the layouts themselves.
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
