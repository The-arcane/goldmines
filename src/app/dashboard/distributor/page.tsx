
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, Outlet, Distributor, Order } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Warehouse, Package, FileText } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function DistributorDashboardPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [assignedOutlets, setAssignedOutlets] = useState<Outlet[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDistributorData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get distributor for current user
      const { data: distributorData, error: distributorError } = await supabase
        .from('distributors')
        .select('*')
        .eq('admin_user_id', user.id)
        .single();

      if (distributorError || !distributorData) {
        console.error("Could not find distributor for this admin.", distributorError);
        setLoading(false);
        return;
      }
      setDistributor(distributorData);
      const currentDistributorId = distributorData.id;

      // 2. Fetch team members, outlets, and orders in parallel
      const [memberLinksRes, outletsRes, ordersRes] = await Promise.all([
        supabase.from("distributor_users").select("users(*)").eq("distributor_id", currentDistributorId),
        supabase.from("outlets").select("*").limit(10), // Placeholder logic for assigned outlets
        supabase.from("orders").select("*, outlets(name)").eq("distributor_id", currentDistributorId).order("created_at", { ascending: false }).limit(5)
      ]);

      // Process team members
      if (memberLinksRes.data) {
        const members = memberLinksRes.data.map((link : any) => link.users).filter(member => member && member.id !== user.id) as User[];
        setTeamMembers(members);
      }

      // Process assigned outlets
      if (outletsRes.data) {
        setAssignedOutlets(outletsRes.data);
      }

      // Process recent orders
      if (ordersRes.data) {
        setRecentOrders(ordersRes.data as Order[]);
      }

    } catch (error) {
        console.error("Error fetching distributor dashboard data:", error);
    } finally {
        setLoading(false);
    }
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
  
  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Delivered': return 'default';
        case 'Pending': return 'destructive';
        case 'Dispatched': return 'outline';
        case 'Approved': return 'secondary';
        default: return 'secondary';
    }
  }


  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">
            {distributor?.name || 'Distributor'} Dashboard
          </h1>
          <p className="text-muted-foreground">
            An overview of your organization's operations.
          </p>
        </div>
        <div className="flex gap-2">
            <Button asChild variant="outline">
                <Link href="/dashboard/distributor/users">
                    <Users className="mr-2 h-4 w-4" /> Manage Team
                </Link>
            </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
                <Package className="mr-2 h-4 w-4" />
            </CardHeader>
            <CardContent>
                {loading ? <div className="h-8 w-1/4 rounded bg-muted animate-pulse"></div> : <div className="text-2xl font-bold">{recentOrders.length}</div>}
                <p className="text-xs text-muted-foreground">In the last 7 days</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned Outlets</CardTitle>
                <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 {loading ? <div className="h-8 w-1/4 rounded bg-muted animate-pulse"></div> : <div className="text-2xl font-bold">{assignedOutlets.length}</div>}
                <p className="text-xs text-muted-foreground">In your distribution network</p>
            </CardContent>
        </Card>
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
                <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 {loading ? <div className="h-8 w-1/4 rounded bg-muted animate-pulse"></div> : <div className="text-2xl font-bold">₹0.00</div>}
                <p className="text-xs text-muted-foreground">Total outstanding payments</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>A list of your 5 most recent orders.</CardDescription>
                </div>
                 <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/distributor/orders">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
                 {loading ? <p className="text-center text-muted-foreground p-4">Loading orders...</p> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Outlet</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentOrders.length > 0 ? recentOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell>{(order as any).outlets?.name || 'N/A'}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                                    <TableCell>{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className="text-right">₹{order.total_value?.toFixed(2) || '0.00'}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground p-8">
                                        No recent orders found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
         <Card className="col-span-full lg:col-span-3">
            <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Your assigned delivery partners.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                {loading ? <p className="text-center text-muted-foreground p-4">Loading team...</p> : (
                    <div className="space-y-4">
                        {teamMembers.length > 0 ? teamMembers.map(member => (
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
                        )) : (
                            <p className="text-center text-muted-foreground p-8">No team members found.</p>
                         )}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    