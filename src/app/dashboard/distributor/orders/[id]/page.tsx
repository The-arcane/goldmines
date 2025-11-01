
"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Order, OrderItem } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { updateOrderStatus } from "@/lib/actions";
import { ArrowLeft, FileText, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const fetchOrderDetails = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        
        const { data, error } = await supabase
            .from('orders')
            .select('*, outlets (name, address), order_items(*, skus(name, product_code))')
            .eq('id', params.id)
            .single();

        if (error || !data) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch order details."});
            console.error(error);
            router.push('/dashboard/distributor/orders');
            return;
        }

        setOrder(data as Order);
        setItems(data.order_items as OrderItem[] || []);
        setLoading(false);
    }, [user, params.id, router, toast]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    const handleUpdateStatus = (status: 'Approved' | 'Rejected') => {
        if (!order) return;
        startTransition(async () => {
            const result = await updateOrderStatus(order.id, status);
            if(result.success) {
                toast({ title: `Order ${status}`, description: `The order has been marked as ${status}.`});
                fetchOrderDetails(); // Re-fetch to show the latest status
            } else {
                toast({ variant: 'destructive', title: "Update failed", description: result.error});
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

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
    }

    if (!order) {
        return <div className="text-center p-8">Order not found.</div>
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Order Details
                </h1>
                <Badge variant={getStatusVariant(order.status)} className="ml-auto sm:ml-0">{order.status}</Badge>
                <div className="hidden items-center gap-2 md:ml-auto md:flex">
                     {order.status === 'Pending' && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('Rejected')} disabled={isPending}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                            <Button size="sm" onClick={() => handleUpdateStatus('Approved')} disabled={isPending}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                            </Button>
                        </>
                    )}
                    {order.status === 'Approved' && (
                        <Button variant="outline" size="sm">Generate Bill</Button>
                    )}
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
                <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Order #{order.id}</CardTitle>
                            <CardDescription>
                                Date: {format(new Date(order.order_date), "MMM d, yyyy, h:mm a")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.skus?.name}</TableCell>
                                            <TableCell>{item.skus?.product_code}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">₹{item.unit_price.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">₹{item.total_price.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                         <CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
                            <div className="text-s text-muted-foreground">
                                Order Total: <span className="font-bold text-lg text-foreground">₹{order.total_value.toFixed(2)}</span>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
                 <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Outlet Details</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                            <div className="grid gap-2">
                                <div className="font-semibold">{order.outlets?.name}</div>
                                <address className="not-italic text-muted-foreground">
                                    {order.outlets?.address}
                                </address>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
             <div className="flex items-center justify-center gap-2 md:hidden">
                {order.status === 'Pending' && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('Rejected')} disabled={isPending}>Reject</Button>
                        <Button size="sm" onClick={() => handleUpdateStatus('Approved')} disabled={isPending}>Approve</Button>
                    </>
                 )}
            </div>
        </main>
    );
}
