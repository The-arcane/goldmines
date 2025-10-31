"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Home,
  Users,
  Map,
  BarChart,
  Truck,
  Warehouse,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const navItems = {
  admin: [
    { href: "/dashboard/admin", icon: Home, label: "Dashboard" },
    { href: "/dashboard/outlets", icon: Warehouse, label: "Outlets" },
    { href: "/dashboard/visits", icon: BarChart, label: "Visits Log" },
    { href: "/dashboard/users", icon: Users, label: "Users" },
  ],
  sales_executive: [
    { href: "/dashboard/sales", icon: Map, label: "My Route" },
    { href: "/dashboard/my-visits", icon: BarChart, label: "Visit History" },
  ],
  distributor: [
    { href: "/dashboard/distributor", icon: Home, label: "Dashboard" },
    { href: "/dashboard/orders", icon: Package, label: "Orders" },
  ],
  delivery_partner: [
    { href: "/dashboard/delivery", icon: Truck, label: "My Deliveries" },
  ],
};

export function Sidebar({ userRole }: { userRole: UserRole | undefined }) {
  const pathname = usePathname();
  if (!userRole) return null;
  
  const items = navItems[userRole] || [];

  return (
    <div className="hidden border-r bg-card md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold font-headline">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="">SuccessArrow</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {items.map(({ href, icon: Icon, label, badge }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  pathname === href && "bg-muted text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {badge && (
                  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    {badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
