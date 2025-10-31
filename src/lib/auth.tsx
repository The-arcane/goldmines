
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
    // This query now directly accesses the table without complex helper functions
    // and relies on the RLS policy `auth_id = auth.uid()`
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id) // Querying the public.users table directly
      .single();

    if (error) {
      // The PostgREST error for "zero rows" is not very descriptive.
      // We provide a more helpful error message in this case.
      if (error.code === 'PGRST116') {
        console.error("Error fetching user profile: No profile found for the authenticated user. Ensure a corresponding row exists in the 'public.users' table.");
      } else {
        console.error("Error fetching user profile:", error);
      }
      return null;
    }
    
    // The role is numeric in the DB, so we map it to a string for the app
    const appProfile: User = {
        id: profile.id,
        auth_id: supabaseUser.id, // Use the auth_id from the session user
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
    const getActiveSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        setLoading(false);
        return;
      }

      if (session) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      }
      setLoading(false);
    };

    getActiveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session) {
            const profile = await fetchUserProfile(session.user);
            setUser(profile);
            if (event === 'SIGNED_IN') {
                router.push('/dashboard');
            }
        } else {
          setUser(null);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, router, pathname]);


  const handleRedirect = useCallback((currentUser: User | null, currentPath: string) => {
    if (!loading) {
      if (!currentUser && currentPath !== '/login') {
        router.push('/login');
      } else if (currentUser && (currentPath === '/login' || currentPath === '/')) {
        router.push('/dashboard');
      }
    }
  }, [router, loading]);

  useEffect(() => {
    // This effect runs only when loading transitions from true to false
    if (!loading) {
      handleRedirect(user, pathname);
    }
  }, [user, loading, pathname, handleRedirect]);


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
