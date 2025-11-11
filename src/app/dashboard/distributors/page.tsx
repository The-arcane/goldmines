
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Distributor, User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AddDistributorDialog } from "@/components/dashboard/distributors/add-distributor-dialog";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditDistributorDialog } from "@/components/dashboard/distributors/edit-distributor-dialog";
import Link from 'next/link';

export default function DistributorsPage() {
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchData = useCallback(async () => {
        setLoading(true);
        const distributorsPromise = supabase.from("distributors").select("*").order("name", { ascending: true });
        const usersPromise = supabase.from("users").select("id, name");

        const [distributorsRes, usersRes] = await Promise.all([distributorsPromise, usersPromise]);

        if (distributorsRes.data) setDistributors(distributorsRes.data);
        if (usersRes.data) setUsers(usersRes.data as User[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        if(user) {
            fetchData();
        }
    }, [fetchData, user]);

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
                    <div className="ml-auto flex items-center gap-2">
                        <Button asChild size="sm" className="h-8 gap-1">
                            <Link href="/dashboard/admin/create-stock-order">
                                <PlusCircle className="h-3.5 w-3.5" />
                                Create Stock Order
                            </Link>
                        </Button>
                        <AddDistributorDialog onDistributorAdded={fetchData} users={users} />
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
                                    <TableHead>Address</TableHead>
                                    <TableHead>GST Number</TableHead>
                                    <TableHead className="text-right">Created On</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {distributors.map((distributor) => (
                                    <TableRow key={distributor.id}>
                                        <TableCell className="font-medium">{distributor.name}</TableCell>
                                        <TableCell>{getAdminName(distributor.admin_user_id)}</TableCell>
                                        <TableCell>{distributor.address || 'N/A'}</TableCell>
                                        <TableCell>{distributor.gst_number || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{format(new Date(distributor.created_at), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <EditDistributorDialog 
                                                        distributor={distributor} 
                                                        onDistributorUpdated={fetchData} 
                                                        users={users}
                                                    >
                                                        <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left">
                                                            Edit
                                                        </button>
                                                    </EditDistributorDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
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
