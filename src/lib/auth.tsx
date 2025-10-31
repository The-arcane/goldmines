
"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User, UserRole } from './types';
import { supabase } from './supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';

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
        3: 'distributor',
        4: 'delivery_partner',
    };
    return roleMap[role] || 'sales_executive'; // Fallback role
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (error) {
        if (error.code === 'PGRST116') {
            console.error("Error fetching user profile: No profile found for the authenticated user. Ensure a corresponding row exists in the 'public.users' table.");
        } else {
            console.error("Error fetching user profile:", error);
        }
        return null;
    }
    
    const appProfile: User = {
        id: profile.id,
        auth_id: supabaseUser.id,
        name: profile.name,
        email: profile.email,
        role: mapNumericRoleToString(profile.role),
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        parent_user_id: profile.parent_user_id
    };

    return appProfile;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
          // Redirect on sign-in if not already on a dashboard page
          if (event === 'SIGNED_IN' && !pathname.startsWith('/dashboard')) {
            router.push('/dashboard');
          }
        } else {
          setUser(null);
          // Redirect to login if there's no session and not already on the login page
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
        setLoading(false);
      }
    );

    // This handles the initial page load check
    const checkInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const profile = await fetchUserProfile(session.user);
            setUser(profile);
            if (pathname === '/login' || pathname === '/') {
                router.replace('/dashboard');
            }
        } else {
            if (pathname !== '/login') {
                router.replace('/login');
            }
        }
        setLoading(false);
    };

    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, router, pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
