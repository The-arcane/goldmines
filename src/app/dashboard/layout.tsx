

"use client";

import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/lib/types";

export default function DashboardLayout({
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
    if (user?.role === 'sales_executive') {
      router.replace("/salesperson/dashboard");
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

  // If loading is done but there is no session or the user is a sales exec,
  // the useEffect will handle the redirect. Rendering null prevents a brief flash.
  if (!session || user?.role === 'sales_executive') {
    return null;
  }

  // Only render the layout if loading is false and we have a valid user session
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar userRole={user.role} />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-muted/40">
          {children}
        </main>
        <footer className="bg-muted/40 p-6 pt-0 text-right text-xs text-muted-foreground">
          <a href="https://linktr.ee/SparkEdgeInnovations" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Developed by SparkEdge Innovations
          </a>
        </footer>
      </div>
    </div>
  );
}
