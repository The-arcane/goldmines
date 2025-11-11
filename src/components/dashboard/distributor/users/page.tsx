

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
import { useTranslation } from "@/components/i18n/provider";

const distributorAllowedRoles: { value: UserRole, label: string }[] = [
    { value: 'sales_executive', label: 'Sales Executive' },
];

const roleDisplayNames: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    sales_executive: 'Sales Executive',
    distributor_admin: 'Distributor Admin',
};


export default function DistributorUsersPage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDistributorData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
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
                setTeamMembers([]);
                setLoading(false);
                return;
            }

            const memberIds = memberLinks.map(link => link.user_id);

            if (memberIds.length === 0) {
                 setTeamMembers([]);
                 setLoading(false);
                 return;
            }

            // 3. Fetch the full profiles of those users.
            const { data: members, error: membersError } = await supabase
                .from('users')
                .select('*')
                .in('id', memberIds)
                .order("created_at", { ascending: false });

            if (membersError) {
                 console.error("Error fetching team member profiles:", membersError);
                 setTeamMembers([]);
            } else {
                 setTeamMembers(members as User[]);
            }
        } catch (error) {
            console.error("An error occurred fetching distributor user data:", error);
            setTeamMembers([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if(user) {
            fetchDistributorData();
        } else {
            setLoading(false);
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

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>{t('Manage Team')}</CardTitle>
                        <CardDescription>
                           {t('A list of all team members in your organization.')}
                        </CardDescription>
                    </div>
                    <div className="ml-auto">
                        {distributor && (
                            <AddUserDialog 
                                onUserAdded={fetchDistributorData} 
                                allowedRoles={distributorAllowedRoles}
                                defaultRole="sales_executive"
                                // Pass the specific distributor this user belongs to
                                distributorId={String(distributor.id)} 
                            />
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading team members...</div>
                    ) : teamMembers.length > 0 ? (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Email')}</TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead className="text-right">{t('Joined')}</TableHead>
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
                                                    <Badge variant="secondary">{roleDisplayNames[member.role] || 'Unknown'}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{format(new Date(member.created_at), 'MMM d, yyyy')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card List */}
                            <div className="grid gap-4 md:hidden">
                                {teamMembers.map((member) => (
                                     <Card key={member.id}>
                                        <CardHeader>
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={member.avatar_url} alt={member.name} />
                                                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <CardTitle className="text-lg">{member.name}</CardTitle>
                                                    <CardDescription className="break-all">{member.email}</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardFooter className="flex justify-between text-sm">
                                             <Badge variant="secondary">{roleDisplayNames[member.role] || 'Unknown'}</Badge>
                                             <span className="text-muted-foreground">{t('Joined')}: {format(new Date(member.created_at), 'MMM d, yyyy')}</span>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
                            {t('No team members found. Add one to get started.')}
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
