
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Warehouse, CheckCircle } from "lucide-react";

type StatData = {
  totalOutlets: number;
  activeUsers: number;
  successfulVisits: number;
};

type StatCardsProps = {
  stats: StatData;
  loading: boolean;
};


export function StatCards({ stats, loading }: StatCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
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
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
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
          <CardTitle className="text-sm font-medium">
            Successful Visits
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.successfulVisits}</div>
          <p className="text-xs text-muted-foreground">
            Visits or orders created today
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
