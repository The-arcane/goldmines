
"use client";

import { UserNav } from "@/components/dashboard/user-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Rocket } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { MobileSidebar } from "./mobile-sidebar";

export function Header() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <MobileSidebar />
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1">
        {/* Header content like search can go here */}
      </div>
      <UserNav />
    </header>
  );
}
