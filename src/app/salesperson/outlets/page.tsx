
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
    const { user } = useAuth();
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
        fetchOutlets();
    }, [fetchOutlets]);

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>My Outlets</CardTitle>
                        <CardDescription>
                           A list of all outlets you have added.
                        </CardDescription>
                    </div>
                    <div className="ml-auto">
                        <AddSalespersonOutletDialog onOutletAdded={fetchOutlets} />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading your outlets...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {outlets.length > 0 ? outlets.map((outlet) => (
                                    <TableRow key={outlet.id}>
                                        <TableCell className="font-medium">{outlet.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{outlet.type}</Badge>
                                        </TableCell>
                                        <TableCell>{outlet.address}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground p-8">
                                            You haven't added any outlets yet.
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

    