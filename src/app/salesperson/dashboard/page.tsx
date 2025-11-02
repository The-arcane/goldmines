
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { Attendance, Outlet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, MapPin, Package, IndianRupee, ShoppingCart } from "lucide-react";
import { AttendanceDialog } from "@/components/salesperson/attendance-dialog";
import { SalespersonMap } from "@/components/salesperson/live-map";
import { AddSalespersonOutletDialog } from "@/components/salesperson/add-outlet-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrderDialog } from "@/components/salesperson/create-order-dialog";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineDistance } from "@/lib/utils";


export default function SalespersonDashboardPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [attendance, setAttendance] = useState<Attendance | null>(null);
    const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);
    const { coords } = useGeolocation({ enableHighAccuracy: true });

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const today = new Date().toISOString().slice(0, 10);
        
        const attendancePromise = supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .gte('checkin_time', `${today}T00:00:00.000Z`)
            .lte('checkin_time', `${today}T23:59:59.999Z`)
            .order('checkin_time', { ascending: false })
            .limit(1)
            .maybeSingle();

        // In a real app, this should be scoped to outlets assigned to the user.
        // For now, we fetch all to allow for geofence detection on any of them.
        const outletsPromise = supabase.from('outlets').select('*');

        const [
            { data: attendanceData },
            { data: outletsData, error: outletsError }
        ] = await Promise.all([attendancePromise, outletsPromise]);

        if (attendanceData) setAttendance(attendanceData as Attendance);

        if (outletsError) {
            toast({ variant: "destructive", title: "Error", description: "Could not load outlet data." });
            setAllOutlets([]);
        } else {
            setAllOutlets(outletsData || []);
        }

        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, fetchDashboardData]);
    
    const activeOutlets = useMemo(() => {
        if (!coords || allOutlets.length === 0) {
            return [];
        }

        return allOutlets.filter(outlet => {
            const distance = haversineDistance(coords, { lat: outlet.lat, lng: outlet.lng });
            return distance <= 150; // User is within 150m radius
        });
    }, [coords, allOutlets]);


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
                    <CardContent><div className="text-2xl font-bold">{activeOutlets.length}</div></CardContent>
                </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valid Check-ins</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">0</div></CardContent>
                </Card>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Live Route</CardTitle>
                        <CardDescription>Your current location and active outlets.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                             <Skeleton className="h-[400px] w-full" />
                        ): (
                            <SalespersonMap outlets={allOutlets} activeOutlets={activeOutlets} />
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Active Outlets</CardTitle>
                        <CardDescription>Create an order at an outlet you are currently visiting.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : activeOutlets.length > 0 ? (
                            <div className="space-y-2">
                                {activeOutlets.map((outlet) => (
                                    <div key={outlet.id} className="flex items-center justify-between rounded-md border p-3">
                                        <div>
                                            <p className="font-medium">{outlet.name}</p>
                                            <p className="text-sm text-muted-foreground">{outlet.address}</p>
                                        </div>
                                        <CreateOrderDialog outlet={outlet} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-8 border-dashed border-2 rounded-md h-full">
                                <ShoppingCart className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="font-semibold">No Active Visits</p>
                                <p className="text-sm text-muted-foreground">You are not in the geofence of any outlet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
