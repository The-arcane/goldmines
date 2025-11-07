
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
  const { user, loading, sessionRefreshed } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the session is explicitly refreshed and loading is false
    if (!loading && sessionRefreshed && !user) {
      router.replace("/login");
    }
  }, [user, loading, sessionRefreshed, router]);
  
  // Show loading spinner until the session is confirmed to be either present or not
  if (loading || !sessionRefreshed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If session is refreshed but there's no user, it's safe to show a spinner while redirecting
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Prevent rendering for wrong roles while redirecting
  if (user.role === 'sales_executive') {
     return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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
