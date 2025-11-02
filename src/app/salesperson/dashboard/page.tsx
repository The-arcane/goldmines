
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { Attendance, Outlet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, MapPin, Package, IndianRupee, PlusCircle } from "lucide-react";
import { AttendanceDialog } from "@/components/salesperson/attendance-dialog";
import { SalespersonMap } from "@/components/salesperson/live-map";
import { AddSalespersonOutletDialog } from "@/components/salesperson/add-outlet-dialog";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";


export default function SalespersonDashboardPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [attendance, setAttendance] = useState<Attendance | null>(null);
    const [activeOutlets, setActiveOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const today = new Date().toISOString().slice(0, 10);
        
        // Fetch current attendance status
        const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .gte('checkin_time', `${today}T00:00:00.000Z`)
            .lte('checkin_time', `${today}T23:59:59.999Z`)
            .order('checkin_time', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (attendanceData) setAttendance(attendanceData as Attendance);

        // Fetch active visits to determine which outlets to show on the map
        const { data: activeVisitsData, error: visitError } = await supabase
            .from('visits')
            .select('outlet_id')
            .eq('user_id', user.id)
            .is('exit_time', null);
        
        if (visitError) {
            toast({ variant: "destructive", title: "Error", description: "Could not load your active visits." });
            setActiveOutlets([]);
            setLoading(false);
            return;
        }

        if (activeVisitsData && activeVisitsData.length > 0) {
            const activeOutletIds = activeVisitsData.map(v => v.outlet_id);
            const { data: outletsData, error: outletError } = await supabase
                .from('outlets')
                .select('*')
                .in('id', activeOutletIds);
            
            if (outletError) {
                toast({ variant: "destructive", title: "Error", description: "Could not load outlet details." });
                setActiveOutlets([]);
            } else {
                setActiveOutlets(outletsData || []);
            }
        } else {
            // If no active visits, fetch all outlets as a fallback for display.
            // This can be optimized to fetch only assigned outlets.
             const { data: allOutlets, error: allOutletsError } = await supabase.from("outlets").select("*");
             if(allOutletsError) {
                toast({ variant: "destructive", title: "Error", description: "Could not load outlet details." });
                setActiveOutlets([]);
             } else {
                setActiveOutlets(allOutlets || []);
             }
        }

        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, fetchDashboardData]);

    const isCheckedIn = attendance?.status === 'Online';
    const isCheckedOut = attendance?.status === 'Offline';

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Welcome, {user?.name.split(' ')[0]}</h1>
                    <p className="text-muted-foreground">Here's your overview for the day.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <AttendanceDialog type="checkin" onAttendanceMarked={fetchDashboardData} disabled={isCheckedIn || isCheckedOut}>
                        <Button variant={isCheckedIn ? "secondary" : "default"} disabled={isCheckedIn || isCheckedOut}>
                            <Clock className="mr-2 h-4 w-4"/> Start Day
                        </Button>
                    </AttendanceDialog>
                    <AttendanceDialog type="checkout" onAttendanceMarked={fetchDashboardData} disabled={!isCheckedIn || isCheckedOut}>
                        <Button variant="destructive" disabled={!isCheckedIn || isCheckedOut}>
                           <Clock className="mr-2 h-4 w-4"/> End Day
                        </Button>
                    </AttendanceDialog>
                    <AddSalespersonOutletDialog onOutletAdded={fetchDashboardData} />
                     <Button asChild>
                        <Link href="/salesperson/orders/create">
                            <PlusCircle className="mr-2 h-4 w-4"/> Create Order
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orders Placed</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">0</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sales Value</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">₹0.00</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outlets Visited</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">0</div></CardContent>
                </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valid Check-ins</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">0</div></CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Live Route</CardTitle>
                    <CardDescription>Your current location and active outlets.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <Skeleton className="h-[400px] w-full rounded-lg" />
                    ) : (
                        <SalespersonMap outlets={activeOutlets} />
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
