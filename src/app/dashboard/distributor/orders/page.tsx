
"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Order, Distributor } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { generateInvoice } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

export default function OrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

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
            .from("orders")
            .select("id, order_date, total_amount, status, outlets(name), is_invoice_created, invoices(id)")
            .eq('distributor_id', distributorData.id)
            .order("order_date", { ascending: false });

        if (error) {
            console.error("Error fetching orders:", error);
            setOrders([]);
        } else {
            setOrders(data as Order[] || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (!authLoading) {
            fetchOrders();
        }
    }, [authLoading, fetchOrders]);

    const handleGenerateInvoice = (orderId: number) => {
        startTransition(async () => {
            toast({ title: "Generating Bill...", description: "Please wait a moment." });
            const result = await generateInvoice(orderId);
            if (result && result.error) {
                toast({
                    variant: "destructive",
                    title: "Bill Generation Failed",
                    description: result.error,
                });
            }
        });
    }
    
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
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : orders.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">Order ID</TableHead>
                                            <TableHead>Outlet</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono">#{order.id}</TableCell>
                                                <TableCell>{(order as any).outlets?.name || 'N/A'}</TableCell>
                                                <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                                                <TableCell>{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
                                                <TableCell className="text-right">₹{order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={`/dashboard/distributor/orders/${order.id}`}>
                                                            View
                                                        </Link>
                                                    </Button>
                                                     {order.is_invoice_created ? (
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={`/invoice/${order.invoices?.[0]?.id}`}>
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                View Bill
                                                            </Link>
                                                        </Button>
                                                     ) : (
                                                         <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            disabled={isPending || order.status !== 'Delivered'}
                                                            onClick={() => handleGenerateInvoice(order.id)}
                                                         >
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            Bill
                                                        </Button>
                                                     )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="grid gap-4 md:hidden">
                                {orders.map((order) => (
                                    <Card key={order.id}>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center justify-between">
                                                <span>Order #{order.id}</span>
                                                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                            </CardTitle>
                                            <CardDescription>
                                                 {(order as any).outlets?.name || 'N/A'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex justify-between items-center text-sm">
                                            <div className="text-muted-foreground">{format(new Date(order.order_date), 'MMM d, yyyy')}</div>
                                            <div className="font-semibold text-lg">₹{order.total_amount?.toFixed(2) || '0.00'}</div>
                                        </CardContent>
                                        <CardFooter className="flex gap-2">
                                             <Button asChild variant="outline" size="sm" className="flex-1">
                                                <Link href={`/dashboard/distributor/orders/${order.id}`}>
                                                    View Details
                                                </Link>
                                            </Button>
                                             {order.is_invoice_created ? (
                                                <Button asChild variant="default" size="sm" className="flex-1">
                                                    <Link href={`/invoice/${order.invoices?.[0]?.id}`}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        View Bill
                                                    </Link>
                                                </Button>
                                             ) : (
                                                 <Button 
                                                    variant="default" 
                                                    size="sm"
                                                    className="flex-1"
                                                    disabled={isPending || order.status !== 'Delivered'}
                                                    onClick={() => handleGenerateInvoice(order.id)}
                                                 >
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Generate Bill
                                                </Button>
                                             )}
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
                            No orders found yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
