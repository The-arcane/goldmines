
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
    // Wait until loading is finished
    if (!loading) {
      if (!user) {
        // If there's no user, redirect to login
        router.replace("/login");
      } else if (user.role === 'sales_executive') {
        // If user has the wrong role for this layout, redirect
        router.replace("/salesperson/dashboard");
      }
    }
  }, [user, loading, router]);
  
  // While loading, or if the user is null/incorrect role (before redirect happens), show a spinner.
  // This is the key fix: we don't render children until we are sure the user is authenticated and has the correct role.
  if (loading || !user || user.role === 'sales_executive') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If loading is false and we have a valid user for this layout, render the dashboard.
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
