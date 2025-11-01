
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function SalespersonReportsPage() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
      <div className="flex flex-col items-center gap-1 text-center">
        <BarChart className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-2xl font-bold tracking-tight">
          Your Reports
        </h3>
        <p className="text-sm text-muted-foreground">
          Your personal performance metrics will be available here soon.
        </p>
      </div>
    </div>
  );
}
