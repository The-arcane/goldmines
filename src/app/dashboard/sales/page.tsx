import { SalesLiveMap } from "@/components/dashboard/sales/live-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { outlets, users, visits } from "@/lib/data";
import { MapPin, Check, History } from "lucide-react";
import { format } from "date-fns";

export default function SalesDashboardPage() {
  // Mocking data for a specific sales executive
  const currentUser = users.find(u => u.role === 'sales_executive');
  const assignedOutlets = outlets.filter(o => currentUser?.assigned_outlet_ids?.includes(o.id));
  const myVisits = visits.filter(v => v.user_id === currentUser?.id).slice(0, 5);

  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <Card>
            <CardHeader>
                <CardTitle>Live Route</CardTitle>
                <CardDescription>Your assigned outlets and current location.</CardDescription>
            </CardHeader>
            <CardContent>
                <SalesLiveMap outlets={assignedOutlets} />
            </CardContent>
        </Card>
      </div>
      <div className="grid auto-rows-max items-start gap-4 md:gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Assigned Outlets</CardTitle>
                <CardDescription>Click to manually check-in.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    <div className="grid gap-4">
                        {assignedOutlets.map(outlet => (
                            <div key={outlet.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                                <MapPin className="h-6 w-6 text-muted-foreground" />
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{outlet.name}</p>
                                    <p className="text-sm text-muted-foreground">{outlet.address}</p>
                                </div>
                                <Button variant="outline" size="sm" className="ml-auto">
                                    <Check className="mr-2 h-4 w-4" /> Check-in
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Recent Visits</CardTitle>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-72">
                    <div className="grid gap-4">
                        {myVisits.map(visit => (
                            <div key={visit.id} className="flex items-center gap-4">
                                <History className="h-5 w-5 text-muted-foreground" />
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{outlets.find(o => o.id === visit.outlet_id)?.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(visit.entry_time), "MMM d, yyyy, h:mm a")}
                                        {visit.duration && ` (${visit.duration} mins)`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
