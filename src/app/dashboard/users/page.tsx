

"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, UserRole, Distributor } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AddUserDialog } from "@/components/dashboard/users/add-user-dialog";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

const adminAllowedRoles: { value: UserRole, label: string }[] = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'sales_executive', label: 'Sales Executive' },
    { value: 'distributor_admin', label: 'Distributor Admin' },
];

const roleDisplayNames: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    sales_executive: 'Sales Executive',
    distributor_admin: 'Distributor Admin',
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchData = useCallback(async () => {
        setLoading(true);
        // Admin sees all users
        const usersPromise = supabase.from("users").select("*").order("created_at", { ascending: false });
        // Also fetch all distributors to pass to the AddUserDialog for assigning delivery partners
        const distributorsPromise = supabase.from("distributors").select("*");

        const [usersRes, distributorsRes] = await Promise.all([usersPromise, distributorsPromise]);

        if (usersRes.data) {
            setUsers(usersRes.data as User[]);
        }
         if (distributorsRes.data) {
            setDistributors(distributorsRes.data as Distributor[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if(user) {
            fetchData();
        }
    }, [fetchData, user]);

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
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>
                            An overview of all users in the system.
                        </CardDescription>
                    </div>
                    <div className="ml-auto">
                        <AddUserDialog 
                            onUserAdded={fetchData} 
                            allowedRoles={adminAllowedRoles}
                            defaultRole="sales_executive"
                            distributors={distributors}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : users.length > 0 ? (
                        <>
                            {/* Desktop View */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead className="text-right">Joined</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={user.avatar_url} alt={user.name} />
                                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                                    </Avatar>
                                                    {user.name}
                                                </TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{roleDisplayNames[user.role] || 'Unknown'}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* Mobile View */}
                            <div className="grid gap-4 md:hidden">
                                {users.map((user) => (
                                    <Card key={user.id}>
                                        <CardHeader className="flex flex-row items-center gap-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={user.avatar_url} alt={user.name} />
                                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-1">
                                                <CardTitle className="text-base leading-tight">{user.name}</CardTitle>
                                                <CardDescription className="text-xs break-all">{user.email}</CardDescription>
                                            </div>
                                        </CardHeader>
                                        <CardFooter className="flex justify-between items-center text-sm">
                                            <Badge variant="secondary">{roleDisplayNames[user.role] || 'Unknown'}</Badge>
                                            <span className="text-muted-foreground">Joined: {format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
                            No users found.
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
