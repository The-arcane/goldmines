"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, UserRole } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AddUserDialog } from "@/components/dashboard/users/add-user-dialog";
import { useAuth } from "@/lib/auth";

const distributorAllowedRoles: { value: UserRole, label: string }[] = [
    { value: 'delivery_partner', label: 'Delivery Partner' },
];

export default function DistributorUsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        if (!user) return;
        setLoading(true);
        // Distributor sees only users they have created
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq('parent_user_id', user.id)
            .order("created_at", { ascending: false });

        if (data) {
            setUsers(data);
        } else if (error) {
            console.error("Error fetching users:", error);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchUsers();
    }, [user]);

    const getInitials = (name: string) => {
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`;
        }
        return names[0].substring(0, 2);
    };
    
    const mapRoleToString = (role: number | string) => {
        const roleMap: { [key: number]: string } = {
            1: 'Admin',
            2: 'Sales Executive',
            3: 'Distributor',
            4: 'Delivery Partner'
        };

        if (typeof role === 'number' && roleMap[role]) {
            return roleMap[role];
        }
        
        if (typeof role === 'string') {
            return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        return 'Unknown';
    };


    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>Manage Delivery Partners</CardTitle>
                        <CardDescription>
                           A list of all delivery partners you have created.
                        </CardDescription>
                    </div>
                    <div className="ml-auto">
                        <AddUserDialog 
                            onUserAdded={fetchUsers} 
                            allowedRoles={distributorAllowedRoles}
                            defaultRole="delivery_partner"
                            creator={user}
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
                                            <Badge variant="secondary">{mapRoleToString(user.role as any)}</Badge>
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
