
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { Attendance, Outlet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Package, IndianRupee, PlusCircle } from "lucide-react";
import { AttendanceDialog } from "@/components/salesperson/attendance-dialog";
import { SalespersonMap } from "@/components/salesperson/live-map";
import { AddSalespersonOutletDialog } from "@/components/salesperson/add-outlet-dialog";
import Link from "next/link";


export default function SalespersonDashboardPage() {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<Attendance | null>(null);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
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
            
        const outletsPromise = supabase
            .from('outlets')
            .select('*'); // Fetch all for now, can be optimized later

        const [{ data: attendanceData }, { data: outletsData }] = await Promise.all([attendancePromise, outletsPromise]);

        if (attendanceData) setAttendance(attendanceData as Attendance);
        if (outletsData) setOutlets(outletsData);
        setLoading(false);
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

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
            
            <SalespersonMap outlets={outlets} loading={loading} />

        </div>
    );
}

    