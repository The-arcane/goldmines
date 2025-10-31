"use client";

import { SalesLiveMap } from "@/components/dashboard/sales/live-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, History, MapPin } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, useMemo } from "react";
import type { Outlet, Visit, User } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { haversineDistance } from "@/lib/utils";

export default function SalesDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignedOutlets, setAssignedOutlets] = useState<Outlet[]>([]);
  const [myVisits, setMyVisits] = useState<Visit[]>([]);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      const fetchData = async () => {
        setLoading(true);

        // Fetch all outlets for visit history details
        const { data: allOutletsData } = await supabase.from("outlets").select("*");
        if (allOutletsData) setAllOutlets(allOutletsData);

        // Fetch assigned outlets for current user
        // This is a placeholder for a real assignment logic. In a real app,
        // you'd likely have a join table or an array of IDs in the user profile.
        const { data: outletsData, error: outletsError } = await supabase.from("outlets").select("*");
        if (outletsError) {
          toast({ variant: "destructive", title: "Error fetching outlets", description: outletsError.message });
        } else {
          setAssignedOutlets(outletsData || []);
        }

        // Fetch recent visits for current user
        const { data: visitsData, error: visitsError } = await supabase
          .from("visits")
          .select("*")
          .eq("user_id", user.id)
          .order("entry_time", { ascending: false })
          .limit(5);
        if (visitsError) {
          toast({ variant: "destructive", title: "Error fetching visits", description: visitsError.message });
        } else {
          setMyVisits(visitsData || []);
        }

        setLoading(false);
      };
      fetchData();
    }
  }, [user, toast]);

  const handleManualCheckIn = async (outlet: Outlet) => {
    if (!user) return;
    
    // In a real app, you'd check the user's actual GPS location against the geofence
    // For this demo, we'll assume they are within radius.
    const entryTime = new Date().toISOString();

    const { data, error } = await supabase.from('visits').insert({
      user_id: user.id,
      outlet_id: outlet.id,
      entry_time: entryTime,
      within_radius: true,
      // exit_time and duration_minutes are left null until checkout
    }).select().single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: error.message
      });
    } else {
      toast({
        title: "Checked In!",
        description: `Your visit to ${outlet.name} has been logged.`
      });
      // Refresh visits list
      setMyVisits(prev => [data, ...prev].slice(0,5));
    }
  };


  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <Card>
            <CardHeader>
                <CardTitle>Live Route</CardTitle>
                <CardDescription>Your assigned outlets and current location.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <p>Loading map...</p> : <SalesLiveMap outlets={assignedOutlets} />}
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
                 {loading ? <p>Loading outlets...</p> : (
                    <ScrollArea className="h-72">
                        <div className="grid gap-4">
                            {assignedOutlets.map(outlet => (
                                <div key={outlet.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                                    <MapPin className="h-6 w-6 text-muted-foreground" />
                                    <div className="grid gap-1">
                                        <p className="text-sm font-medium leading-none">{outlet.name}</p>
                                        <p className="text-sm text-muted-foreground">{outlet.address}</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="ml-auto" onClick={() => handleManualCheckIn(outlet)}>
                                        <Check className="mr-2 h-4 w-4" /> Check-in
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                 )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Recent Visits</CardTitle>
            </CardHeader>
            <CardContent>
                 {loading ? <p>Loading visits...</p> : (
                    <ScrollArea className="h-72">
                        <div className="grid gap-4">
                            {myVisits.map(visit => (
                                <div key={visit.id} className="flex items-center gap-4">
                                    <History className="h-5 w-5 text-muted-foreground" />
                                    <div className="grid gap-1">
                                        <p className="text-sm font-medium leading-none">{allOutlets.find(o => o.id === visit.outlet_id)?.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(visit.entry_time), "MMM d, yyyy, h:mm a")}
                                            {visit.duration_minutes && ` (${visit.duration_minutes} mins)`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                 )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
