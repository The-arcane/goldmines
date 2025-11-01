
"use client";

import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/salesperson/sidebar";
import { Header } from "@/components/salesperson/header";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SalespersonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Wait for the auth state to load
    }

    if (!user) {
      // If not logged in, redirect to the salesperson login page
      router.replace("/salesperson/login");
    } else if (user.role !== 'sales_executive') {
      // If logged in but not a sales executive, redirect to the main login page
      router.replace("/login");
    }
  }, [user, loading, router]);
  
  // Show a loading spinner while checking auth or if the user is not the correct role yet
  if (loading || !user || user.role !== 'sales_executive') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If the user is a sales executive, render the layout
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
