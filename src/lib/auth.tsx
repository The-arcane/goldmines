"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User, UserRole } from './types';
import { users } from './data';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUserRole = localStorage.getItem('userRole');
    if (storedUserRole) {
      const loggedInUser = users.find(u => u.role === storedUserRole);
      setUser(loggedInUser || null);
    }
    setLoading(false);
  }, []);

  const handleRedirect = useCallback((user: User | null) => {
    if (!user && pathname.startsWith('/dashboard')) {
      router.push('/login');
    } else if (user && pathname === '/login') {
        switch(user.role) {
            case 'admin':
                router.push('/dashboard/admin');
                break;
            case 'sales_executive':
                router.push('/dashboard/sales');
                break;
            case 'distributor':
                router.push('/dashboard/distributor');
                break;
            case 'delivery_partner':
                router.push('/dashboard/delivery');
                break;
            default:
                router.push('/dashboard');
        }
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!loading) {
      handleRedirect(user);
    }
  }, [user, loading, handleRedirect]);


  const login = (role: UserRole) => {
    const userToLogin = users.find(u => u.role === role);
    if (userToLogin) {
      setUser(userToLogin);
      localStorage.setItem('userRole', userToLogin.role);
      handleRedirect(userToLogin);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  const value = { user, login, logout, loading };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

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
