import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Warehouse, Route, CheckCircle } from "lucide-react";
import { outlets, users, visits } from "@/lib/data";

export function StatCards() {
  const totalOutlets = outlets.length;
  const activeUsers = users.filter(u => u.role === 'sales_executive' || u.role === 'delivery_partner').length;
  const visitsToday = visits.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length;
  const successfulVisits = visits.filter(v => v.duration && v.duration > 5).length;
  
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
          <div className="text-2xl font-bold">{totalOutlets}</div>
          <p className="text-xs text-muted-foreground">
            +2 since last month
          </p>
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
          <div className="text-2xl font-bold">+{activeUsers}</div>
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
          <div className="text-2xl font-bold">+{visitsToday}</div>
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
          <div className="text-2xl font-bold">{successfulVisits}</div>
          <p className="text-xs text-muted-foreground">
            Total visits over 5 minutes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
