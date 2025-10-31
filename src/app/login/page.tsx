import { LoginForm } from '@/components/auth/login-form';
import { Package } from 'lucide-react';

export default function LoginPage() {
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
        <LoginForm />
      </div>
    </div>
  );
}
