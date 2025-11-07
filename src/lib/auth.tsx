
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
  const [loading, setLoading] = useState(true);
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
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const supabaseUser = session?.user ?? null;
        if (supabaseUser) {
          const profile = await fetchUserProfile(supabaseUser);
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("Error in onAuthStateChange handler", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
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
