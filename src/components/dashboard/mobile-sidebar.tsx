
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
  Rocket,
  Building,
  ShoppingCart,
  Box,
  PlusCircle,
  Banknote,
  LineChart,
  ClipboardList,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/components/i18n/provider";

const navItems = {
  admin: [
    { href: "/dashboard/admin", icon: Home, label: "Dashboard" },
    { href: "/dashboard/analytics", icon: LineChart, label: "Analytics" },
    { href: "/dashboard/distributors", icon: Building, label: "Distributors" },
    { href: "/dashboard/admin/stock-orders", icon: ClipboardList, label: "Stock Orders" },
    { href: "/dashboard/outlets", icon: Warehouse, label: "Outlets" },
    { href: "/dashboard/skus", icon: Box, label: "SKUs & Inventory" },
    { href: "/dashboard/distributor-stock", icon: Boxes, label: "Distributor Stock" },
    { href: "/dashboard/users", icon: Users, label: "Users" },
  ],
  sales_executive: [
    { href: "/salesperson/dashboard", icon: Home, label: "Dashboard" },
    { href: "/salesperson/outlets", icon: Warehouse, label: "My Outlets" },
    { href: "/salesperson/orders", icon: ShoppingCart, label: "My Orders" },
    { href: "/salesperson/visits", icon: BarChart, label: "Visit History" },
    { href: "/salesperson/route", icon: Map, label: "Route Plan" },
    { href: "/salesperson/reports", icon: BarChart, label: "My Reports" },
  ],
  distributor_admin: [
    { href: "/dashboard/distributor", icon: Home, label: "Dashboard" },
    { href: "/dashboard/distributor/create-order", icon: PlusCircle, label: "Create Stock Order"},
    { href: "/dashboard/distributor/stock-orders", icon: Package, label: "My Stock Orders"},
    { href: "/dashboard/distributor/orders", icon: ShoppingCart, label: "Retail Orders" },
    { href: "/dashboard/distributor/payments", icon: Banknote, label: "Payments" },
    { href: "/dashboard/distributor/skus", icon: Box, label: "SKU Management" },
    { href: "/dashboard/distributor/users", icon: Users, label: "Manage Team" },
    { href: "/dashboard/analytics", icon: LineChart, label: "Analytics" },
  ],
  delivery_partner: [
    { href: "/dashboard/delivery", icon: Truck, label: "My Deliveries" },
    { href: "/dashboard/orders/create", icon: PlusCircle, label: "Create Order" },
    { href: "/dashboard/stock-order-items/mark-as-delivered", icon: PlusCircle, label: "Mark as Delivered" },
  ],
};

export function MobileSidebar({ userRole }: { userRole: UserRole | undefined }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const handleLinkClick = () => {
    // Find the close button of the sheet and simulate a click.
    const closeButton = document.querySelector('[data-radix-dialog-close]');
    if (closeButton instanceof HTMLElement) {
      closeButton.click();
    }
  };

  if (!userRole) return null;
  
  const items = navItems[userRole as keyof typeof navItems] || [];

  const isCurrentPage = (href: string) => {
    if (pathname === href) return true;
    if (href.split('/').length > 2 && pathname.startsWith(href)) return true;
    return false;
  };
  
  return (
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
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isCurrentPage(href) ? "bg-muted text-primary" : ""
              )}
            >
              <Icon className="h-4 w-4" />
              {t(label as keyof IntlMessages)}
              {badge && (
                <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  {badge}
                </Badge>
              )}
            </Link>
          ))}
        </nav>
      </div>
       <div className="mt-auto p-4 text-center text-xs text-muted-foreground">
          Version 1.0.1.0 by SparkEdge Innovations
       </div>
    </div>
  );
}
