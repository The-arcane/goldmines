
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
    if (!loading && !user) {
      router.replace("/salesperson/login");
    } else if (!loading && user && user.role !== 'sales_executive') {
      // If a non-sales exec user gets here, redirect them
      router.replace("/login");
    }
  }, [user, loading, router]);
  
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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
