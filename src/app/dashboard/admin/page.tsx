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
import { outlets, visits } from "@/lib/data";

export default function AdminDashboardPage() {
  const recentVisits = visits.slice(0, 5);

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <StatCards />
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Visits</CardTitle>
            <CardDescription>
              An overview of the most recent sales executive visits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisitsTable visits={recentVisits} />
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
            <OutletsMap outlets={outlets} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
