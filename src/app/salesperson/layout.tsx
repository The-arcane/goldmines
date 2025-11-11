
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
  const { user, loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Do nothing while loading
    }
    if (!session) {
      router.replace("/login");
      return;
    }
    if (user?.role !== 'sales_executive') {
      router.replace("/login");
      return;
    }
  }, [user, session, loading, router]);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  // If loading is done but conditions aren't met, useEffect handles redirect.
  // Rendering null prevents brief layout flash.
  if (!session || user?.role !== 'sales_executive') {
     return null;
  }

  // Only render if we have a valid sales executive session
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
