
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { Attendance, Outlet, Order } from "@/lib/types";
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
    const [todaysOrders, setTodaysOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { coords } = useGeolocation({ enableHighAccuracy: true });

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const today = new Date().toISOString().slice(0, 10);
        const userAuthId = user.auth_id;
        
        const attendancePromise = supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user.id)
            .gte('checkin_time', `${today}T00:00:00.000Z`)
            .lte('checkin_time', `${today}T23:59:59.999Z`)
            .order('checkin_time', { ascending: false })
            .limit(1)
            .maybeSingle();

        const outletsPromise = supabase.from('outlets').select('*');

        const ordersPromise = supabase
            .from('orders')
            .select('*')
            .eq('created_by_auth_id', userAuthId)
            .gte('order_date', `${today}T00:00:00.000Z`)
            .lte('order_date', `${today}T23:59:59.999Z`);

        const [
            { data: attendanceData },
            { data: outletsData, error: outletsError },
            { data: ordersData, error: ordersError }
        ] = await Promise.all([attendancePromise, outletsPromise, ordersPromise]);

        if (attendanceData) setAttendance(attendanceData as Attendance);
        if (ordersData) setTodaysOrders(ordersData as Order[]);

        if (outletsError) {
            toast({ variant: "destructive", title: "Error", description: "Could not load outlet data." });
            setAllOutlets([]);
        } else {
            setAllOutlets(outletsData || []);
        }

        if (ordersError) {
            toast({ variant: "destructive", title: "Error", description: "Could not load today's orders." });
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
            if (!outlet.lat || !outlet.lng) return false;
            const distance = haversineDistance(coords, { lat: outlet.lat, lng: outlet.lng });
            return distance <= 150; // User is within 150m radius
        });
    }, [coords, allOutlets]);

    const dashboardStats = useMemo(() => {
        const ordersPlaced = todaysOrders.length;
        const salesValue = todaysOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        return { ordersPlaced, salesValue };
    }, [todaysOrders]);


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
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{dashboardStats.ordersPlaced}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sales Value</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">₹{dashboardStats.salesValue.toFixed(2)}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outlets Visited</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{activeOutlets.length}</div>}
                    </CardContent>
                </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valid Check-ins</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">0</div>}
                    </CardContent>
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
                                        <CreateOrderDialog outlet={outlet} onOrderPlaced={fetchDashboardData} />
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
