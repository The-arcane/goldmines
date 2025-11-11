
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
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Outlet, Visit, User, Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useTranslation } from "@/components/i18n/provider";
import { translateText } from "@/ai/flows/translate-text";
import { useAuth } from "@/lib/auth";

type AdminStats = {
  totalOutlets: number;
  activeUsers: number;
  visitsToday: number;
  successfulVisits: number;
};

export default function AdminDashboardPage() {
  const { user, loading: authLoading, refetchKey } = useAuth();
  const { t, locale } = useTranslation();
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalOutlets: 0,
    activeUsers: 0,
    visitsToday: 0,
    successfulVisits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [translatedStatuses, setTranslatedStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const visitsPromise = supabase.from("visits").select("*").order("entry_time", { ascending: false }).limit(5);
      const ordersPromise = supabase.from("orders").select("*, outlets(name)").order("order_date", { ascending: false }).limit(5);
      const outletsPromise = supabase.from("outlets").select("*");
      const usersPromise = supabase.from("users").select("*");
      
      const outletsCountPromise = supabase.from("outlets").select('*', { count: 'exact', head: true });
      const usersCountPromise = supabase.from("users").select('*', { count: 'exact', head: true }).in('role', [2, 4]); // sales_executive, delivery_partner
      const visitsTodayCountPromise = supabase.from("visits").select('*', { count: 'exact', head: true }).gte('entry_time', `${today}T00:00:00.000Z`);
      const ordersTodayCountPromise = supabase.from("orders").select('id', { count: 'exact', head: true }).gte('order_date', `${today}T00:00:00.000Z`);


      const [
        visitsRes, 
        ordersRes, 
        outletsRes, 
        usersRes,
        outletsCountRes,
        usersCountRes,
        visitsTodayCountRes,
        ordersTodayCountRes
      ] = await Promise.all([
        visitsPromise, 
        ordersPromise, 
        outletsPromise, 
        usersPromise,
        outletsCountPromise,
        usersCountPromise,
        visitsTodayCountPromise,
        ordersTodayCountRes,
      ]);

      if (visitsRes.data) setRecentVisits(visitsRes.data);
      if (ordersRes.data) setRecentOrders(ordersRes.data as Order[]);
      if (outletsRes.data) setOutlets(outletsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      
      const visitsTodayCount = visitsTodayCountRes.count ?? 0;
      const ordersTodayCount = ordersTodayCountRes.count ?? 0;

      setStats({
        totalOutlets: outletsCountRes.count ?? 0,
        activeUsers: usersCountRes.count ?? 0,
        visitsToday: visitsTodayCount,
        successfulVisits: visitsTodayCount + ordersTodayCount,
      });

      setLoading(false);
    };

    if (user) {
      fetchData();
    }
  }, [user, refetchKey]);
  
  useEffect(() => {
    if (locale === 'hi' && recentOrders.length > 0) {
      const uniqueStatuses = [...new Set(recentOrders.map(order => order.status))];
      
      translateText({ texts: uniqueStatuses, targetLanguage: 'Hindi' })
        .then(response => {
          const statusMap: Record<string, string> = {};
          uniqueStatuses.forEach((status, index) => {
            statusMap[status] = response.translations[index];
          });
          setTranslatedStatuses(statusMap);
        })
        .catch(error => {
          console.error("Translation error:", error);
        });
    }
  }, [locale, recentOrders]);

  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Delivered': return 'default';
        case 'Pending': return 'destructive';
        case 'Dispatched': return 'outline';
        case 'Approved': return 'secondary';
        default: return 'secondary';
    }
  }

  const getTranslatedStatus = (status: string) => {
      if (locale === 'hi' && translatedStatuses[status]) {
          return translatedStatuses[status];
      }
      return status;
  }


  return (
    <div className="flex flex-col gap-4 md:gap-8">
      <StatCards stats={stats} loading={loading} />
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
         <Card className="xl:col-span-full">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                A summary of the latest orders from all distributors.
                </CardDescription>
            </div>
             <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/dashboard/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? <p>Loading recent orders...</p> : (
               <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Outlet')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('Status')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('Date')}</TableHead>
                        <TableHead className="text-right">{t('Value')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentOrders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell>{(order as any).outlets?.name || 'N/A'}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                                <Badge variant={getStatusVariant(order.status)}>
                                    {getTranslatedStatus(order.status)}
                                </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
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
