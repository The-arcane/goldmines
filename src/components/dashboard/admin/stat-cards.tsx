"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Warehouse, Route, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type StatData = {
  totalOutlets: number;
  activeUsers: number;
  visitsToday: number;
  successfulVisits: number;
};

export function StatCards() {
  const [stats, setStats] = useState<StatData>({
    totalOutlets: 0,
    activeUsers: 0,
    visitsToday: 0,
    successfulVisits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { count: outletsCount } = await supabase.from("outlets").select('*', { count: 'exact', head: true });
      const { count: usersCount } = await supabase.from("users").select('*', { count: 'exact', head: true }).in('role', ['sales_executive', 'delivery_partner']);
      const { count: visitsTodayCount } = await supabase.from("visits").select('*', { count: 'exact', head: true }).gte('entry_time', `${today}T00:00:00.000Z`);
      const { count: successfulVisitsCount } = await supabase.from("visits").select('*', { count: 'exact', head: true }).gt('duration_minutes', 5);

      setStats({
        totalOutlets: outletsCount ?? 0,
        activeUsers: usersCount ?? 0,
        visitsToday: visitsTodayCount ?? 0,
        successfulVisits: successfulVisitsCount ?? 0,
      });

      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-2/4 rounded bg-muted"></div>
            </CardHeader>
            <CardContent>
              <div className="h-7 w-1/4 rounded bg-muted mb-2"></div>
              <div className="h-3 w-3/4 rounded bg-muted"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Outlets
          </CardTitle>
          <Warehouse className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalOutlets}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Field Users
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{stats.activeUsers}</div>
          <p className="text-xs text-muted-foreground">
            Sales & Delivery Teams
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Visits Today</CardTitle>
          <Route className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{stats.visitsToday}</div>
          <p className="text-xs text-muted-foreground">
            Across all outlets
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Successful Visits
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.successfulVisits}</div>
          <p className="text-xs text-muted-foreground">
            Total visits over 5 minutes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
