
"use client";

import { AuthForm } from '@/components/auth/auth-form';
import { Package } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SalespersonLoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
        if (user.role === 'sales_executive') {
            router.replace('/salesperson/dashboard');
        } else {
            // If another role tries to log in here, send them away
            router.replace('/login');
        }
    }
  }, [user, loading, router]);
  
  if (loading || user) {
     return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-headline text-3xl font-bold text-center">SuccessArrow Sales Portal</h1>
          <p className="text-muted-foreground text-center mt-2">
            Log in to manage your daily sales activities.
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
