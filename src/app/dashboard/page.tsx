
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait until loading is false
    
    if (user) {
      switch (user.role) {
        case "admin":
          router.replace("/dashboard/admin");
          break;
        case "sales_executive":
          router.replace("/dashboard/sales");
          break;
        case "distributor_admin":
          router.replace("/dashboard/distributor");
          break;
        case "delivery_partner":
          router.replace("/dashboard/delivery");
          break;
        default:
          // Fallback to a generic dashboard or home if role has no specific page
          router.replace("/login"); 
          break;
      }
    } else {
      // If no user and not loading, redirect to login
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
}
