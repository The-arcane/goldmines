
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Do nothing while loading
    }
    
    if (!user) {
      // If not loading and no user, go to login
      router.replace("/login");
      return;
    }

    // If user is loaded, redirect based on role
    switch (user.role) {
      case "admin":
        router.replace("/dashboard/admin");
        break;
      case "sales_executive":
        router.replace("/salesperson/dashboard");
        break;
      case "distributor_admin":
        router.replace("/dashboard/distributor");
        break;
      case "delivery_partner":
        router.replace("/dashboard/delivery");
        break;
      default:
        // Fallback for any other case
        router.replace("/login"); 
        break;
    }
  }, [user, loading, router]);

  // Render a loading spinner while the redirect is happening
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
}
