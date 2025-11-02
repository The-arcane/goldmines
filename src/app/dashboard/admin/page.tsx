
"use client";

import { StatCards } from "@/components/dashboard/admin/stat-cards";
import { VisitsTable } from "@/components/dashboard/admin/visits-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OutletsMap } from "@/components/dashboard/admin/outlets-map";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Outlet, Visit, User, Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminDashboardPage() {
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const visitsPromise = supabase.from("visits").select("*").order("entry_time", { ascending: false }).limit(5);
      const ordersPromise = supabase.from("orders").select("*, outlets(name)").order("order_date", { ascending: false }).limit(5);
      const outletsPromise = supabase.from("outlets").select("*");
      const usersPromise = supabase.from("users").select("*");

      const [visitsRes, ordersRes, outletsRes, usersRes] = await Promise.all([visitsPromise, ordersPromise, outletsPromise, usersPromise]);

      if (visitsRes.data) setRecentVisits(visitsRes.data);
      if (ordersRes.data) setRecentOrders(ordersRes.data as Order[]);
      if (outletsRes.data) setOutlets(outletsRes.data);
      if (usersRes.data) setUsers(usersRes.data);

      setLoading(false);
    };

    fetchData();
  }, []);

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
    <div className="flex flex-col gap-4 md:gap-8">
      <StatCards />
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Visits</CardTitle>
              <CardDescription>
                An overview of the most recent sales executive visits.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/visits">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? <p>Loading recent visits...</p> : <VisitsTable visits={recentVisits} users={users} outlets={outlets} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outlets Overview</CardTitle>
            <CardDescription>
              Geographical distribution of all outlets.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? <p>Loading outlets map...</p> : <OutletsMap outlets={outlets} />}
          </CardContent>
        </Card>
         <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              A summary of the latest orders from all distributors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <p>Loading recent orders...</p> : (
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
                    {recentOrders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell>{(order as any).outlets?.name || 'N/A'}</TableCell>
                            <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                            <TableCell>{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right">₹{order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
