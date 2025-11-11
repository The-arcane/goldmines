
"use client";

import { UserNav } from "@/components/dashboard/user-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Rocket, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { MobileSidebar } from "./mobile-sidebar";
import { LanguageSwitcher } from "../i18n/language-switcher";
import { useRouter } from "next/navigation";

export function Header() {
  const { user } = useAuth();
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };
  
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
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRefresh}>
        <RefreshCcw className="h-4 w-4" />
        <span className="sr-only">Refresh Data</span>
      </Button>
      <LanguageSwitcher />
      <UserNav />
    </header>
  );
}
