
"use client";

import { useEffect, useState, useCallback, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Order, OrderItem } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { updateOrderStatus, updateOrderAndStock } from "@/lib/actions";
import { ArrowLeft, FileText, CheckCircle, XCircle, Truck, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


export default function OrderDetailsPage({ params }: { params: { id: string } }) {
    const { id } = use(params);
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // New state to track out of stock items
    const [outOfStockItems, setOutOfStockItems] = useState<Set<number>>(new Set());

    const fetchOrderDetails = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        
        const { data, error } = await supabase
            .from('orders')
            .select('*, outlets (name, address), order_items(*, skus(name, product_code))')
            .eq('id', id)
            .single();

        if (error || !data) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch order details."});
            console.error(error);
            router.push('/dashboard/distributor/orders');
            return;
        }

        setOrder(data as Order);
        const orderItems = (data.order_items as OrderItem[] || []);
        setItems(orderItems);
        
        // Initialize out of stock state from DB if exists
        const initialOutOfStock = new Set(orderItems.filter(item => item.is_out_of_stock).map(item => item.id));
        setOutOfStockItems(initialOutOfStock);

        setLoading(false);
    }, [user, id, router, toast]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);
    
    const handleToggleOutOfStock = (itemId: number) => {
        setOutOfStockItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const handleUpdateStatus = (status: 'Dispatched' | 'Rejected') => {
        if (!order) return;
        startTransition(async () => {
            const result = await updateOrderStatus(order.id, status);
            if(result.success) {
                toast({ title: `Order ${status}`, description: `The order has been marked as ${status}.`});
                fetchOrderDetails();
            } else {
                toast({ variant: 'destructive', title: "Update failed", description: result.error});
            }
        });
    }

    const handleDeliverOrder = () => {
         if (!order) return;
        startTransition(async () => {
            const result = await updateOrderAndStock(order.id, Array.from(outOfStockItems));
             if(result.success) {
                toast({ title: `Order Delivered`, description: `Stock has been updated.`});
                fetchOrderDetails();
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
    
    const recalculatedTotal = items.reduce((sum, item) => {
        if (outOfStockItems.has(item.id)) {
            return sum;
        }
        return sum + item.total_price;
    }, 0);


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
                     {order.status === 'Approved' && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('Rejected')} disabled={isPending}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                            <Button size="sm" onClick={() => handleUpdateStatus('Dispatched')} disabled={isPending}>
                                <Truck className="mr-2 h-4 w-4" />
                                Mark as Dispatched
                            </Button>
                        </>
                    )}
                    {order.status === 'Dispatched' && (
                        <Button size="sm" onClick={handleDeliverOrder} disabled={isPending}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark as Delivered
                        </Button>
                    )}
                    {(order.status === 'Delivered') && (
                        <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Generate Bill</Button>
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
                                        <TableHead className="w-[40px]">Stock</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow key={item.id} className={cn(outOfStockItems.has(item.id) && "bg-muted/50")}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={outOfStockItems.has(item.id)}
                                                    onCheckedChange={() => handleToggleOutOfStock(item.id)}
                                                    aria-label="Mark out of stock"
                                                    disabled={order.status === 'Delivered' || order.status === 'Dispatched'}
                                                />
                                            </TableCell>
                                            <TableCell className={cn(outOfStockItems.has(item.id) && "text-muted-foreground line-through")}>
                                                {item.skus?.name}
                                            </TableCell>
                                            <TableCell className={cn(outOfStockItems.has(item.id) && "text-muted-foreground line-through")}>
                                                {item.skus?.product_code}
                                            </TableCell>
                                            <TableCell className={cn("text-right", outOfStockItems.has(item.id) && "text-muted-foreground line-through")}>
                                                {item.quantity}
                                            </TableCell>
                                            <TableCell className={cn("text-right", outOfStockItems.has(item.id) && "text-muted-foreground line-through")}>
                                                ₹{item.unit_price.toFixed(2)}
                                            </TableCell>
                                            <TableCell className={cn("text-right", outOfStockItems.has(item.id) && "text-muted-foreground line-through")}>
                                                ₹{item.total_price.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                         <CardFooter className="flex flex-col items-end gap-2 border-t bg-muted/50 px-6 py-3">
                            <div className="text-sm text-muted-foreground line-through">
                                Original Total: ₹{order.total_amount.toFixed(2)}
                            </div>
                            <div className="text-lg text-foreground">
                                Adjusted Total: <span className="font-bold text-xl">₹{recalculatedTotal.toFixed(2)}</span>
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
                {order.status === 'Approved' && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('Rejected')} disabled={isPending}>Reject</Button>
                        <Button size="sm" onClick={() => handleUpdateStatus('Dispatched')} disabled={isPending}>Mark as Dispatched</Button>
                    </>
                 )}
                 {order.status === 'Dispatched' && (
                    <Button size="sm" onClick={handleDeliverOrder} disabled={isPending} className="w-full">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Delivered
                    </Button>
                )}
            </div>
        </main>
    );
}
