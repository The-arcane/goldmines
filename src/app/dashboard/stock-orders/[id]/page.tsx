
"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { StockOrder } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function StockOrderDetailsPage({ params }: { params: { id: string } }) {
    const { id } = use(params);
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = useState<StockOrder | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchOrderDetails = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        
        const { data, error } = await supabase
            .from('stock_orders')
            .select('*, distributors (name), stock_order_items(*, skus(name, product_code, units_per_case))')
            .eq('id', id)
            .single();

        if (error || !data) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch stock order details."});
            console.error(error);
            router.back();
            return;
        }

        setOrder(data as StockOrder);
        setLoading(false);
    }, [user, id, router, toast]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    
    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Shipped': return 'default';
            case 'Pending': return 'destructive';
            case 'Rejected': return 'outline';
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
                    Stock Order Details
                </h1>
                <Badge variant={getStatusVariant(order.status)} className="ml-auto sm:ml-0">{order.status}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
                <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Order #{order.id}</CardTitle>
                            <CardDescription>
                                Placed on: {format(new Date(order.order_date), "MMM d, yyyy, h:mm a")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">Cases</TableHead>
                                        <TableHead className="text-right">Units/Case</TableHead>
                                        <TableHead className="text-right">Case Price</TableHead>
                                        <TableHead className="text-right">Total Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.stock_order_items?.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.skus?.name}</TableCell>
                                            <TableCell>{item.skus?.product_code}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{item.skus?.units_per_case}</TableCell>
                                            <TableCell className="text-right">₹{item.case_price.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">₹{item.total_price.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                         <CardFooter className="flex flex-col items-end gap-2 border-t bg-muted/50 px-6 py-3">
                            <div className="text-lg text-foreground">
                                Order Total: <span className="font-bold text-xl">₹{order.total_amount.toFixed(2)}</span>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
                 <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Distributor Details</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                            <div className="grid gap-2">
                                <div className="font-semibold">{order.distributors?.name}</div>
                            </div>
                        </CardContent>
                    </Card>
                     {order.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="text-muted-foreground">{order.notes}</p>
                            </CardContent>
                        </Card>
                     )}
                </div>
            </div>
        </main>
    );
}
