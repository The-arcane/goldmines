
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { Attendance } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Package, IndianRupee } from "lucide-react";
import { AttendanceDialog } from "@/components/salesperson/attendance-dialog";
import { Map, AdvancedMarker, Pin, useApiIsLoaded } from "@vis.gl/react-google-maps";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Skeleton } from "@/components/ui/skeleton";

function SalespersonMap() {
    const { coords } = useGeolocation({ enableHighAccuracy: true });
    const isLoaded = useApiIsLoaded();

    if (!isLoaded) return <Skeleton className="h-[400px] w-full" />
    
    return (
         <div className="h-[400px] w-full rounded-lg overflow-hidden border">
            <Map
                mapId="salesperson-live-map"
                defaultCenter={{ lat: 20.5937, lng: 78.9629 }}
                defaultZoom={coords ? 14 : 5}
                center={coords ? { lat: coords.latitude, lng: coords.longitude } : undefined}
                gestureHandling={"greedy"}
                disableDefaultUI={true}
            >
             {coords && (
                <AdvancedMarker position={{ lat: coords.latitude, lng: coords.longitude }}>
                    <div className="relative">
                        <div className="absolute h-6 w-6 rounded-full bg-blue-400 animate-ping"></div>
                        <div className="relative h-6 w-6 rounded-full bg-blue-500 border-2 border-white shadow-md"></div>
                    </div>
                </AdvancedMarker>
             )}
            </Map>
         </div>
    );
}


export default function SalespersonDashboardPage() {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<Attendance | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        
        const fetchAttendance = async () => {
            setLoading(true);
            const today = new Date().toISOString().slice(0, 10);
            
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('user_id', user.id)
                .gte('checkin_time', `${today}T00:00:00.000Z`)
                .lte('checkin_time', `${today}T23:59:59.999Z`)
                .single();

            if (data) {
                setAttendance(data as Attendance);
            }
            setLoading(false);
        };
        fetchAttendance();
    }, [user]);

    const isCheckedIn = attendance?.status === 'Online';
    const isCheckedOut = attendance?.status === 'Offline';

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Welcome, {user?.name.split(' ')[0]}</h1>
                    <p className="text-muted-foreground">Here's your overview for the day.</p>
                </div>
                <div className="flex gap-2">
                    <AttendanceDialog type="checkin" onAttendanceMarked={() => window.location.reload()} disabled={isCheckedIn || isCheckedOut}>
                        <Button variant={isCheckedIn ? "secondary" : "default"} disabled={isCheckedIn || isCheckedOut}>
                            <Clock className="mr-2 h-4 w-4"/> Start Day
                        </Button>
                    </AttendanceDialog>
                    <AttendanceDialog type="checkout" onAttendanceMarked={() => window.location.reload()} disabled={!isCheckedIn || isCheckedOut}>
                        <Button variant="destructive" disabled={!isCheckedIn || isCheckedOut}>
                           <Clock className="mr-2 h-4 w-4"/> End Day
                        </Button>
                    </AttendanceDialog>
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
            
            <SalespersonMap />

        </div>
    );
}
