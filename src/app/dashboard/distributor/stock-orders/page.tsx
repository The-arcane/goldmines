
"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { StockOrder, Distributor } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Check, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateOrderStatus } from "@/lib/actions";


export default function StockOrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<StockOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const fetchOrders = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        };
        setLoading(true);

        const { data: distributorData, error: distributorError } = await supabase
            .from('distributors')
            .select('id')
            .eq('admin_user_id', user.id)
            .single();

        if (distributorError || !distributorData) {
            console.error("Could not find distributor for this admin:", distributorError);
            setOrders([]);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("stock_orders")
            .select("*, invoices(id)")
            .eq('distributor_id', distributorData.id)
            .order("order_date", { ascending: false });

        if (error) {
            console.error("Error fetching stock orders:", error);
            setOrders([]);
        } else {
            setOrders(data as StockOrder[] || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (!authLoading) {
            fetchOrders();
        }
    }, [authLoading, fetchOrders]);
    
    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Delivered': return 'default';
            case 'Shipped': return 'outline';
            case 'Pending': return 'destructive';
            case 'Rejected': return 'outline';
            case 'Approved': return 'secondary';
            default: return 'secondary';
        }
    }
    
    const handleMarkAsDelivered = (orderId: number) => {
        startTransition(async () => {
            // Note: This action is now handled by the admin. 
            // A distributor would confirm delivery, which might trigger a different status update.
            // For now, let's assume the distributor is confirming they received the order.
            const result = await updateOrderStatus(orderId, 'Delivered');
            if(result.success) {
                toast({ title: "Order Received", description: `The stock order has been marked as received and your inventory is updated.`});
                fetchOrders();
            } else {
                toast({ variant: 'destructive', title: "Update failed", description: result.error});
            }
        });
    }


    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>My Stock Orders</CardTitle>
                        <CardDescription>
                           Review the status of all stock orders you have placed with the company.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : orders.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Order ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono">#{order.id}</TableCell>
                                        <TableCell>{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                                        <TableCell className="text-right">₹{order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/stock-orders/${order.id}`}>View</Link>
                                            </Button>
                                             {order.is_invoice_created && order.invoices && order.invoices.length > 0 ? (
                                                <Button asChild variant="secondary" size="sm">
                                                    <Link href={`/invoice/${order.invoices[0].id}`}>
                                                        <FileText className="mr-2 h-4 w-4" /> View Invoice
                                                    </Link>
                                                </Button>
                                            ) : order.status === 'Shipped' && (
                                                <Button 
                                                    variant="default" 
                                                    size="sm" 
                                                    onClick={() => handleMarkAsDelivered(order.id)}
                                                    disabled={isPending}
                                                >
                                                    <Check className="mr-2 h-4 w-4" />
                                                    Mark as Received
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
                            No stock orders found yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
