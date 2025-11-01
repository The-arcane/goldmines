
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, Visit, Order, OrderItem, Sku } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { subDays, format } from 'date-fns';

type SalesRepStats = {
  user: User;
  totalVisits: number;
  avgDuration: number;
};

type DeliveryBoyStats = {
  user: User;
  totalOrdersDelivered: number;
  totalValueDelivered: number;
};

type SkuSalesStats = {
    sku: Sku;
    totalQuantitySold: number;
    totalValueSold: number;
}

type DailyOrderSummary = {
    date: string;
    orders: number;
}

export default function AnalyticsPage() {
    const [salesReps, setSalesReps] = useState<User[]>([]);
    const [deliveryBoys, setDeliveryBoys] = useState<User[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [skus, setSkus] = useState<Sku[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const salesRepsPromise = supabase.from("users").select("*").eq('role', 2); // 2 = sales_executive
            const deliveryBoysPromise = supabase.from("users").select("*").eq('role', 4); // 4 = delivery_partner
            const visitsPromise = supabase.from("visits").select("*");
            const ordersPromise = supabase.from("orders").select("*");
            const orderItemsPromise = supabase.from("order_items").select("*");
            const skusPromise = supabase.from("skus").select("*");

            const [salesRepsRes, deliveryBoysRes, visitsRes, ordersRes, orderItemsRes, skusRes] = await Promise.all([
                salesRepsPromise, 
                deliveryBoysPromise, 
                visitsPromise, 
                ordersPromise,
                orderItemsPromise,
                skusPromise,
            ]);

            if (salesRepsRes.data) setSalesReps(salesRepsRes.data as User[]);
            if (deliveryBoysRes.data) setDeliveryBoys(deliveryBoysRes.data as User[]);
            if (visitsRes.data) setVisits(visitsRes.data);
            if (ordersRes.data) setOrders(ordersRes.data);
            if (orderItemsRes.data) setOrderItems(orderItemsRes.data as OrderItem[]);
            if (skusRes.data) setSkus(skusRes.data as Sku[]);
            
            setLoading(false);
        };
        fetchData();
    }, []);

    const salesRepStats: SalesRepStats[] = useMemo(() => {
        return salesReps.map(rep => {
            const repVisits = visits.filter(v => v.user_id === rep.id && v.duration_minutes);
            const totalVisits = repVisits.length;
            const totalDuration = repVisits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
            const avgDuration = totalVisits > 0 ? totalDuration / totalVisits : 0;
            return { user: rep, totalVisits, avgDuration };
        });
    }, [salesReps, visits]);

    const deliveryBoyStats: DeliveryBoyStats[] = useMemo(() => {
        return deliveryBoys.map(boy => {
            const boyOrders = orders.filter(o => o.delivery_partner_id === boy.id && o.status === 'Delivered');
            const totalOrdersDelivered = boyOrders.length;
            const totalValueDelivered = boyOrders.reduce((sum, o) => sum + (o.total_value || 0), 0);
            return { user: boy, totalOrdersDelivered, totalValueDelivered };
        });
    }, [deliveryBoys, orders]);
    
    const skuSalesStats: SkuSalesStats[] = useMemo(() => {
        const stats: Record<number, SkuSalesStats> = {};
        for(const item of orderItems) {
            if(!stats[item.sku_id]) {
                const sku = skus.find(s => s.id === item.sku_id);
                if(sku) {
                    stats[item.sku_id] = { sku, totalQuantitySold: 0, totalValueSold: 0 };
                }
            }
            if(stats[item.sku_id]) {
                stats[item.sku_id].totalQuantitySold += item.quantity;
                stats[item.sku_id].totalValueSold += item.total_price;
            }
        }
        return Object.values(stats).sort((a,b) => b.totalValueSold - a.totalValueSold);
    }, [orderItems, skus]);

    const dailyOrderData: DailyOrderSummary[] = useMemo(() => {
        const summary: Record<string, number> = {};
        const thirtyDaysAgo = subDays(new Date(), 30);
        
        for (let i = 0; i < 30; i++) {
            const date = format(subDays(new Date(), i), 'MMM d');
            summary[date] = 0;
        }

        const recentOrders = orders.filter(o => new Date(o.order_date) >= thirtyDaysAgo);
        recentOrders.forEach(order => {
            const date = format(new Date(order.order_date), 'MMM d');
            if(summary[date] !== undefined) {
                summary[date]++;
            }
        });
        
        return Object.entries(summary).map(([date, count]) => ({ date, orders: count })).reverse();
    }, [orders]);
    
    const getInitials = (name: string) => {
        if(!name) return '??';
        const names = name.split(' ');
        if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`;
        return names[0].substring(0, 2);
    };

    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Reports & Analytics</h1>
                    <p className="text-muted-foreground">Insights into your team's performance and operations.</p>
                </div>
                 <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export All Reports</Button>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp /> Daily Order Volume</CardTitle>
                    <CardDescription>Number of orders placed in the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    {loading ? (
                        <div className="h-[300px] w-full flex items-center justify-center">Loading chart...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dailyOrderData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>SKU-wise Sales Report</CardTitle>
                        <CardDescription>Performance of each product SKU across all orders.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="text-center p-8">Loading SKU analytics...</div> : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-center">Qty Sold</TableHead>
                                        <TableHead className="text-right">Total Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {skuSalesStats.map(stat => (
                                        <TableRow key={stat.sku.id}>
                                            <TableCell className="font-medium">{stat.sku.name}</TableCell>
                                            <TableCell className="text-center">
                                                 <Badge variant="secondary" className="text-base">{stat.totalQuantitySold}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">₹{stat.totalValueSold.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-8 auto-rows-min xl:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sales Representative Performance</CardTitle>
                            <CardDescription>An overview of visit metrics for each sales executive.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? <div className="text-center p-8">Loading sales analytics...</div> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Executive</TableHead>
                                            <TableHead className="text-center">Visits</TableHead>
                                            <TableHead className="text-right">Avg. Mins</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {salesRepStats.map(stat => (
                                            <TableRow key={stat.user.id}>
                                                <TableCell className="font-medium flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 hidden sm:flex"><AvatarImage src={stat.user.avatar_url} alt={stat.user.name} /><AvatarFallback>{getInitials(stat.user.name)}</AvatarFallback></Avatar>
                                                    <div><div>{stat.user.name}</div><div className="text-sm text-muted-foreground hidden md:block">{stat.user.email}</div></div>
                                                </TableCell>
                                                <TableCell className="text-center"><Badge variant="secondary" className="text-lg">{stat.totalVisits}</Badge></TableCell>
                                                <TableCell className="text-right font-mono">{stat.avgDuration.toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Delivery Partner Performance</CardTitle>
                            <CardDescription>Metrics on delivery efficiency and success rates.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? <div className="text-center p-8">Loading delivery analytics...</div> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Partner</TableHead>
                                            <TableHead className="text-center">Orders</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {deliveryBoyStats.map(stat => (
                                            <TableRow key={stat.user.id}>
                                                <TableCell className="font-medium flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 hidden sm:flex"><AvatarImage src={stat.user.avatar_url} alt={stat.user.name} /><AvatarFallback>{getInitials(stat.user.name)}</AvatarFallback></Avatar>
                                                    <div><div>{stat.user.name}</div><div className="text-sm text-muted-foreground hidden md:block">{stat.user.email}</div></div>
                                                </TableCell>
                                                <TableCell className="text-center"><Badge variant="secondary" className="text-lg">{stat.totalOrdersDelivered}</Badge></TableCell>
                                                <TableCell className="text-right font-mono">₹{stat.totalValueDelivered.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-dashed">
                        <CardHeader className="flex-row items-center gap-4">
                            <AlertCircle className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <CardTitle>Advanced Reports</CardTitle>
                                <CardDescription>Outlet Performance & Delivery Efficiency reports are coming soon.</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </main>
    );
}
