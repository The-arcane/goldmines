
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
  // This flag is no longer needed with the new robust implementation
  // sessionRefreshed: boolean;
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
            // This might happen if profile creation trigger fails. Log out the user.
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const supabaseUser = session?.user ?? null;
        if (supabaseUser) {
          const profile = await fetchUserProfile(supabaseUser);
          setUser(profile);
        } else {
          setUser(null);
        }
        // Only set loading to false after the auth state has been determined.
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);


  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    // Don't push here, let the layouts handle the redirect based on the new auth state
    setLoading(false);
  };
  
  // sessionRefreshed is removed as the new loading state handles it implicitly
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
