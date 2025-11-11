
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        const supabaseUser = session?.user ?? null;
        
        if (supabaseUser) {
            const { data: profile, error } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', supabaseUser.id)
                .single();

            if (profile) {
                setUser({
                    id: profile.id,
                    auth_id: supabaseUser.id,
                    name: profile.name,
                    email: profile.email,
                    role: mapNumericRoleToString(profile.role),
                    avatar_url: profile.avatar_url,
                    created_at: profile.created_at,
                });
            } else {
                 setUser(null);
            }
        } else {
            setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);


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
