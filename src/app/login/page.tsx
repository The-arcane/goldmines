
"use client";

import { AuthForm } from '@/components/auth/auth-form';
import { Package } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    
    if (session && user) {
      // Redirect based on role if user is already logged in
      switch (user.role) {
        case 'super_admin':
        case 'distributor_admin':
        case 'delivery_partner':
          router.replace("/dashboard");
          break;
        case 'sales_executive':
          router.replace("/salesperson/dashboard");
          break;
        default:
          break; // Stay on login if role is unknown
      }
    }
  }, [user, session, loading, router]);
  
  // Show a loading spinner while checking auth status or if already logged in and redirecting
  if (loading || session) {
     return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If loading is false and there is no session, show the login form
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-headline text-3xl font-bold text-center">SuccessArrow Tracker</h1>
          <p className="text-muted-foreground text-center mt-2">
            Location-Aware Sales & Outlet Management
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
