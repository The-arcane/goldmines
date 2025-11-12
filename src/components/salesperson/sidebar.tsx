
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Map,
  BarChart,
  Warehouse,
  Rocket,
  PlusCircle,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/i18n/provider";

const navItems = [
    { href: "/salesperson/dashboard", icon: Home, label: "Dashboard" },
    { href: "/salesperson/outlets", icon: Warehouse, label: "My Outlets" },
    { href: "/salesperson/orders", icon: ShoppingCart, label: "My Orders" },
    { href: "/salesperson/visits", icon: BarChart, label: "Visit History" },
    { href: "/salesperson/route", icon: Map, label: "Route Plan" },
    { href: "/salesperson/reports", icon: BarChart, label: "My Reports" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  
  const isCurrentPage = (href: string) => {
    // Exact match
    if (pathname === href) return true;
    // Handle nested routes
    if (href.split('/').length > 2 && pathname.startsWith(href)) return true;
    return false;
  };
  
  return (
    <div className="hidden border-r bg-card md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/salesperson/dashboard" className="flex items-center gap-2 font-semibold font-headline">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="">Sales Portal</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  isCurrentPage(href) ? "bg-muted text-primary" : ""
                )}
              >
                <Icon className="h-4 w-4" />
                {t(label as keyof IntlMessages)}
              </Link>
            ))}
          </nav>
        </div>
         <div className="mt-auto p-4 text-center text-xs text-muted-foreground">
          Developed by SparkEdge Innovations
        </div>
      </div>
    </div>
  );
}
