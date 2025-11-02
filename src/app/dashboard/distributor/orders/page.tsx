
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Order, Distributor } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        // First, find the distributor ID for the current admin user
        const { data: distributorData, error: distributorError } = await supabase
            .from('distributors')
            .select('id')
            .eq('admin_user_id', user.id)
            .single();

        if (distributorError || !distributorData) {
            console.error("Could not find distributor for this admin:", distributorError);
            setOrders([]); // Ensure orders are cleared if distributor not found
            setLoading(false);
            return;
        }
        setDistributor(distributorData);

        // Then, fetch orders for that distributor ID
        const { data, error } = await supabase
            .from("orders")
            .select("*, outlets(name)")
            .eq('distributor_id', distributorData.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching orders:", error);
            setOrders([]);
        } else {
            setOrders(data as Order[] || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user, fetchOrders]);
    
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
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>Order Management</CardTitle>
                        <CardDescription>
                           Review and manage all incoming orders from your team.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading orders...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Order ID</TableHead>
                                    <TableHead>Outlet</TableHead>
                                    <TableHead className="hidden md:table-cell">Status</TableHead>
                                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.length > 0 ? orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono">#{order.id}</TableCell>
                                        <TableCell>{(order as any).outlets?.name || 'N/A'}</TableCell>
                                        <TableCell className="hidden md:table-cell"><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                                        <TableCell className="hidden sm:table-cell">{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">₹{order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/distributor/orders/${order.id}`}>
                                                    View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground p-8">
                                            No orders found yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}

    
