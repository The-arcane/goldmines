
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { Visit, Outlet } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';

export default function SalespersonVisitsPage() {
    const { user } = useAuth();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        
        const visitsPromise = supabase.from("visits").select("*").eq('user_id', user.id).order("entry_time", { ascending: false });
        const outletsPromise = supabase.from("outlets").select("id, name");

        const [visitsRes, outletsRes] = await Promise.all([visitsPromise, outletsPromise]);
        
        if(visitsRes.data) setVisits(visitsRes.data as Visit[]);
        if(outletsRes.data) setOutlets(outletsRes.data);

        setLoading(false);
    }, [user]);

    useEffect(() => {
        if(user) {
            fetchData();
        }
    }, [user, fetchData]);

    const getOutletName = (outletId: string) => outlets.find(o => o.id === outletId)?.name || 'Unknown Outlet';

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>My Visit History</CardTitle>
                    <CardDescription>A log of all your outlet visits.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading your visit history...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Outlet</TableHead>
                                    <TableHead>Entry Time</TableHead>
                                    <TableHead>Exit Time</TableHead>
                                    <TableHead className="text-right">Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visits.length > 0 ? visits.map((visit) => (
                                    <TableRow key={visit.id}>
                                        <TableCell className="font-medium">{getOutletName(visit.outlet_id)}</TableCell>
                                        <TableCell>{format(parseISO(visit.entry_time), 'MMM d, yyyy, h:mm a')}</TableCell>
                                        <TableCell>{visit.exit_time ? format(parseISO(visit.exit_time), 'h:mm a') : 'In Progress'}</TableCell>
                                        <TableCell className="text-right">
                                            {visit.duration_minutes ? (
                                                <Badge variant="secondary">{visit.duration_minutes} mins</Badge>
                                            ) : (
                                                <Badge variant="outline">--</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground p-8">
                                            No visits found yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
