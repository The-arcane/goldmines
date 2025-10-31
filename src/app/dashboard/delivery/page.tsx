import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";

export default function DeliveryDashboardPage() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
      <div className="flex flex-col items-center gap-1 text-center">
        <Truck className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-2xl font-bold tracking-tight">
          Delivery Partner Dashboard
        </h3>
        <p className="text-sm text-muted-foreground">
          View assigned orders and see your live route.
        </p>
      </div>
    </div>
  );
}
