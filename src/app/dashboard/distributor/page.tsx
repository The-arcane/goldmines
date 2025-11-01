"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, Outlet, Distributor } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Warehouse, PackagePlus } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DistributorDashboardPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [assignedOutlets, setAssignedOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDistributorData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // 1. Find the distributor organization this admin user belongs to.
    const { data: adminDistributorLink } = await supabase
      .from("distributor_users")
      .select("distributor_id")
      .eq("user_id", user.id)
      .single();

    if (!adminDistributorLink) {
      console.error("Could not find distributor for this admin.");
      setLoading(false);
      return;
    }
    const distributorId = adminDistributorLink.distributor_id;

    // 2. Fetch all team members (delivery partners) for this distributor
    const { data: memberLinks } = await supabase
      .from("distributor_users")
      .select("user_id")
      .eq("distributor_id", distributorId);

    if (memberLinks) {
      const memberIds = memberLinks.map((link) => link.user_id);
      const { data: members } = await supabase
        .from("users")
        .select("*")
        .in("id", memberIds)
        .neq("id", user.id); // Exclude the admin themselves

      if (members) setTeamMembers(members as User[]);
    }
    
    // For now, we assume outlets can be assigned to distributors.
    // This is a placeholder for a more complex outlet assignment logic.
    const { data: outlets } = await supabase.from("outlets").select("*").limit(10);
    setAssignedOutlets(outlets || []);


    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">
            Distributor Dashboard
          </h1>
          <p className="text-muted-foreground">
            An overview of your organization's operations.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline">
                <PackagePlus className="mr-2 h-4 w-4" /> Place Order
            </Button>
            <Button asChild>
                <Link href="/dashboard/distributor/users">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Team Member
                </Link>
            </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? <div className="h-8 w-1/4 rounded bg-muted animate-pulse"></div> : <div className="text-2xl font-bold">{teamMembers.length}</div>}
                <p className="text-xs text-muted-foreground">Delivery partners in your team</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned Outlets</CardTitle>
                <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 {loading ? <div className="h-8 w-1/4 rounded bg-muted animate-pulse"></div> : <div className="text-2xl font-bold">{assignedOutlets.length}</div>}
                <p className="text-xs text-muted-foreground">Outlets in your distribution network</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
            <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Your assigned delivery partners.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                {loading ? <p>Loading team...</p> : (
                    <div className="space-y-4">
                        {teamMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-4">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={member.avatar_url} alt={member.name} />
                                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{member.name}</p>
                                    <p className="text-sm text-muted-foreground">{member.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
