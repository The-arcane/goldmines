
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, UserRole, Distributor } from "@/lib/types";
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
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDistributorData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        // 1. Find the distributor organization this admin user belongs to.
        const { data: adminDistributor, error: adminError } = await supabase
            .from('distributors')
            .select('*')
            .eq('admin_user_id', user.id)
            .single();

        if (adminError || !adminDistributor) {
            console.error("Could not find distributor for this admin:", adminError);
            setLoading(false);
            return;
        }
        setDistributor(adminDistributor);

        // 2. Find all user IDs linked to this distributor organization.
        const { data: memberLinks, error: linkError } = await supabase
            .from('distributor_users')
            .select('user_id')
            .eq('distributor_id', adminDistributor.id);

        if (linkError) {
            console.error("Error fetching team members:", linkError);
            setLoading(false);
            return;
        }

        const memberIds = memberLinks.map(link => link.user_id);

        // 3. Fetch the full profiles of those users.
        const { data: members, error: membersError } = await supabase
            .from('users')
            .select('*')
            .in('id', memberIds)
            .order("created_at", { ascending: false });

        if (members) {
            setTeamMembers(members);
        } else {
            console.error("Error fetching team member profiles:", membersError);
        }

        setLoading(false);
    }, [user]);

    useEffect(() => {
        if(user) {
            fetchDistributorData();
        }
    }, [user, fetchDistributorData]);

    const getInitials = (name: string) => {
        if (!name) return '??';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`;
        }
        return names[0].substring(0, 2);
    };
    
    const mapRoleToString = (role: UserRole) => {
        return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>Manage Your Team</CardTitle>
                        <CardDescription>
                           A list of all team members in your organization.
                        </CardDescription>
                    </div>
                    <div className="ml-auto">
                        {distributor && (
                            <AddUserDialog 
                                onUserAdded={fetchDistributorData} 
                                allowedRoles={distributorAllowedRoles}
                                defaultRole="delivery_partner"
                                // Pass the specific distributor this user belongs to
                                distributorId={distributor.id} 
                            />
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading team members...</div>
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
                                {teamMembers.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={member.avatar_url} alt={member.name} />
                                                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                            </Avatar>
                                            {member.name}
                                        </TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{mapRoleToString(member.role)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{format(new Date(member.created_at), 'MMM d, yyyy')}</TableCell>
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
