
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, UserRole, Distributor } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AddUserDialog } from "@/components/dashboard/users/add-user-dialog";

// Admins can create Sales Execs and Delivery Partners directly.
// Distributor Admins are created via the Distributors page.
const adminAllowedRoles: { value: UserRole, label: string }[] = [
    { value: 'sales_executive', label: 'Sales Executive' },
    { value: 'delivery_partner', label: 'Delivery Partner' },
    // Note: 'admin' role is omitted for safety. New admins should be created via Supabase dashboard.
];

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        // Admin sees all users
        const usersPromise = supabase.from("users").select("*").order("created_at", { ascending: false });
        // Also fetch all distributors to pass to the AddUserDialog for assigning delivery partners
        const distributorsPromise = supabase.from("distributors").select("*");

        const [usersRes, distributorsRes] = await Promise.all([usersPromise, distributorsPromise]);

        if (usersRes.data) {
            setUsers(usersRes.data);
        }
         if (distributorsRes.data) {
            setDistributors(distributorsRes.data);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchData();
    }, []);

    const getInitials = (name: string) => {
        if(!name) return '??';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`;
        }
        return names[0].substring(0, 2);
    };
    
    const mapRoleToString = (role: UserRole) => {
        if (!role) return 'Unknown';
        return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };


    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>
                            An overview of all users in the system. Distributor Admins are managed on the Distributors page.
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
                        <div className="text-center p-8">Loading users...</div>
                    ) : (
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
                                            <Badge variant="secondary">{mapRoleToString(user.role)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
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
