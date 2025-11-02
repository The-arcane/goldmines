
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Order, OrderItem } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function MyOrderDetailsPage({ params }: { params: { id: string } }) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrderDetails = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        
        const { data, error } = await supabase
            .from('orders')
            .select('*, outlets (name, address), order_items(*, skus(name, product_code))')
            .eq('id', params.id)
            .eq('created_by_auth_id', user.auth_id) // Security check
            .single();

        if (error || !data) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch order details or you don't have access."});
            console.error(error);
            router.push('/salesperson/orders');
            return;
        }

        setOrder(data as Order);
        setItems(data.order_items as OrderItem[] || []);
        setLoading(false);
    }, [user, params.id, router, toast]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    
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
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>
        );
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
                                Order Total: <span className="font-bold text-lg text-foreground">₹{order.total_amount.toFixed(2)}</span>
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
        </main>
    );
}
