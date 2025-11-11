
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Outlet } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddSalespersonOutletDialog } from "@/components/salesperson/add-outlet-dialog";

export default function MyOutletsPage() {
    const { user, loading: authLoading } = useAuth();
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOutlets = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from("outlets")
            .select("*")
            .eq('created_by', user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching outlets:", error);
        } else {
            setOutlets(data || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchOutlets();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading, fetchOutlets]);

    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="grid gap-2">
                        <CardTitle>My Outlets</CardTitle>
                        <CardDescription>
                           A list of all outlets you have added.
                        </CardDescription>
                    </div>
                    <div className="flex-shrink-0">
                        <AddSalespersonOutletDialog onOutletAdded={fetchOutlets} />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading your outlets...</div>
                    ) : outlets.length > 0 ? (
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30%]">Name</TableHead>
                                        <TableHead className="w-[15%]">Type</TableHead>
                                        <TableHead>Address</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {outlets.map((outlet) => (
                                        <TableRow key={outlet.id}>
                                            <TableCell className="font-medium">{outlet.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{outlet.type}</Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-pre-wrap break-words">{outlet.address}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
                            You haven't added any outlets yet.
                        </div>
                    )}

                    {outlets.length > 0 && !loading && (
                        <div className="grid gap-4 md:hidden">
                            {outlets.map((outlet) => (
                                <div key={outlet.id} className="rounded-lg border bg-card text-card-foreground p-4">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold">{outlet.name}</h3>
                                        <Badge variant="outline">{outlet.type}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">{outlet.address}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
