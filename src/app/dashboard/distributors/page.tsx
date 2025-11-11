
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Distributor, User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AddDistributorDialog } from "@/components/dashboard/distributors/add-distributor-dialog";
import { useAuth } from "@/lib/auth";

export default function DistributorsPage() {
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { refetchKey } = useAuth();

    const fetchData = useCallback(async () => {
        setLoading(true);
        const distributorsPromise = supabase.from("distributors").select("*").order("name", { ascending: true });
        const usersPromise = supabase.from("users").select("id, name"); // Only need id and name for mapping

        const [distributorsRes, usersRes] = await Promise.all([distributorsPromise, usersPromise]);

        if (distributorsRes.data) setDistributors(distributorsRes.data);
        if (usersRes.data) setUsers(usersRes.data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, refetchKey]);

    const getAdminName = (adminUserId: number | null) => {
        if (!adminUserId) return <span className="text-muted-foreground">Not Assigned</span>;
        return users.find(u => u.id === adminUserId)?.name || "Unknown Admin";
    };

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>Distributor Organizations</CardTitle>
                        <CardDescription>
                           Create and manage distributor organizations and their administrators.
                        </CardDescription>
                    </div>
                    <div className="ml-auto">
                        <AddDistributorDialog onDistributorAdded={fetchData} />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading distributors...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organization Name</TableHead>
                                    <TableHead>Admin User</TableHead>
                                    <TableHead className="text-right">Created On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {distributors.map((distributor) => (
                                    <TableRow key={distributor.id}>
                                        <TableCell className="font-medium">{distributor.name}</TableCell>
                                        <TableCell>{getAdminName(distributor.admin_user_id)}</TableCell>
                                        <TableCell className="text-right">{format(new Date(distributor.created_at), 'MMM d, yyyy')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
