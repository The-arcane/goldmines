"use client";

import { StatCards } from "@/components/dashboard/admin/stat-cards";
import { VisitsTable } from "@/components/dashboard/admin/visits-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OutletsMap } from "@/components/dashboard/admin/outlets-map";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Outlet, Visit, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const visitsPromise = supabase.from("visits").select("*").order("entry_time", { ascending: false }).limit(5);
      const outletsPromise = supabase.from("outlets").select("*");
      const usersPromise = supabase.from("users").select("*");

      const [visitsRes, outletsRes, usersRes] = await Promise.all([visitsPromise, outletsPromise, usersPromise]);

      if (visitsRes.data) setRecentVisits(visitsRes.data);
      if (outletsRes.data) setOutlets(outletsRes.data);
      if (usersRes.data) setUsers(usersRes.data);

      setLoading(false);
    };

    fetchData();
  }, []);


  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <StatCards />
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Visits</CardTitle>
              <CardDescription>
                An overview of the most recent sales executive visits.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/visits">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? <p>Loading recent visits...</p> : <VisitsTable visits={recentVisits} users={users} outlets={outlets} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outlets Overview</CardTitle>
            <CardDescription>
              Geographical distribution of all outlets.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? <p>Loading outlets map...</p> : <OutletsMap outlets={outlets} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
