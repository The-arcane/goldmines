"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User } from './types';
import { supabase } from './supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', supabaseUser.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    return profile;
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
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, router]);


  const handleRedirect = useCallback((currentUser: User | null) => {
    if (!loading) {
      if (!currentUser && pathname.startsWith('/dashboard')) {
        router.push('/login');
      } else if (currentUser && (pathname === '/login' || pathname === '/')) {
        router.push('/dashboard');
      }
    }
  }, [pathname, router, loading]);

  useEffect(() => {
    handleRedirect(user);
  }, [user, handleRedirect]);


  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };


  const value = { user, loading, logout };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
         <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
         </div>
      ) : children}
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
