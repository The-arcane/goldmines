
"use client";

import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Do nothing while loading
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === 'sales_executive') {
      router.replace("/salesperson/dashboard");
      return;
    }
  }, [user, loading, router]);
  
  // This is the key change: always show a loading screen while `loading` is true
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If loading is done but the user is null or a sales exec, the useEffect will handle the redirect.
  // Rendering null prevents a brief flash of the dashboard layout.
  if (!user || user.role === 'sales_executive') {
    return null; 
  }

  // Only render the layout if loading is false and we have a valid, authorized user
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar userRole={user.role} />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
