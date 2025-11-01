
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, Visit } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type SalesRepStats = {
  user: User;
  totalVisits: number;
  avgDuration: number;
};

export default function AnalyticsPage() {
    const [salesReps, setSalesReps] = useState<User[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const salesRepsPromise = supabase.from("users").select("*").eq('role', 2); // 2 = sales_executive
            const visitsPromise = supabase.from("visits").select("*");

            const [salesRepsRes, visitsRes] = await Promise.all([salesRepsPromise, visitsPromise]);

            if (salesRepsRes.data) setSalesReps(salesRepsRes.data as User[]);
            if (visitsRes.data) setVisits(visitsRes.data);
            
            setLoading(false);
        };
        fetchData();
    }, []);

    const salesRepStats: SalesRepStats[] = useMemo(() => {
        return salesReps.map(rep => {
            const repVisits = visits.filter(v => v.user_id === rep.id && v.duration_minutes);
            const totalVisits = repVisits.length;
            const totalDuration = repVisits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
            const avgDuration = totalVisits > 0 ? totalDuration / totalVisits : 0;
            return {
                user: rep,
                totalVisits,
                avgDuration,
            };
        });
    }, [salesReps, visits]);
    
     const getInitials = (name: string) => {
        if(!name) return '??';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`;
        }
        return names[0].substring(0, 2);
    };

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="grid gap-4">
                <h1 className="font-headline text-3xl font-bold">Reports & Analytics</h1>
                <p className="text-muted-foreground">Insights into your team's performance and operations.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Sales Representative Performance</CardTitle>
                    <CardDescription>An overview of visit metrics for each sales executive.</CardDescription>
                </CardHeader>
                <CardContent>
                     {loading ? (
                        <div className="text-center p-8">Loading analytics...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Executive</TableHead>
                                    <TableHead className="text-center">Total Visits</TableHead>
                                    <TableHead className="text-right">Avg. Visit Duration (Mins)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {salesRepStats.map(stat => (
                                    <TableRow key={stat.user.id}>
                                         <TableCell className="font-medium flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={stat.user.avatar_url} alt={stat.user.name} />
                                                <AvatarFallback>{getInitials(stat.user.name)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div>{stat.user.name}</div>
                                                <div className="text-sm text-muted-foreground">{stat.user.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="text-lg">{stat.totalVisits}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{stat.avgDuration.toFixed(1)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Delivery Boy Performance</CardTitle>
                    <CardDescription>Metrics on delivery efficiency and success rates. (Coming Soon)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground p-8">
                        Delivery analytics will be available here in a future update.
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
