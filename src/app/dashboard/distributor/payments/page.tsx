
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Order, Distributor } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { RecordPaymentDialog } from "@/components/dashboard/distributor/record-payment-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentsPage() {
    const { user, refetchKey } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPaymentData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const { data: distributorData, error: distributorError } = await supabase
            .from('distributors')
            .select('id')
            .eq('admin_user_id', user.id)
            .single();

        if (distributorError || !distributorData) {
            console.error("Could not find distributor for this admin:", distributorError);
            setLoading(false);
            return;
        }
        setDistributor(distributorData);

        const { data, error } = await supabase
            .from("orders")
            .select("*, outlets(name)")
            .eq('distributor_id', distributorData.id)
            .neq('status', 'Rejected') // Ignore rejected orders for payment
            .order("order_date", { ascending: false });

        if (error) {
            console.error("Error fetching orders for payment:", error);
        } else {
            setOrders(data as Order[] || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchPaymentData();
        }
    }, [user, fetchPaymentData, refetchKey]);

    const totalDues = useMemo(() => {
        return orders.reduce((sum, order) => {
            const due = (order.total_amount || 0) - (order.amount_paid || 0);
            return sum + due;
        }, 0);
    }, [orders]);

    const getPaymentStatusVariant = (status: string) => {
        switch (status) {
            case 'Paid': return 'default';
            case 'Unpaid': return 'destructive';
            case 'Partially Paid': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>Payment Ledger</CardTitle>
                        <CardDescription>
                           Track payments and outstanding dues for all orders.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : orders.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Outlet</TableHead>
                                            <TableHead className="hidden sm:table-cell">Date</TableHead>
                                            <TableHead className="hidden md:table-cell">Payment Status</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Paid</TableHead>
                                            <TableHead className="text-right">Due</TableHead>
                                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => {
                                            const balanceDue = order.total_amount - (order.amount_paid || 0);
                                            return (
                                                <TableRow key={order.id}>
                                                    <TableCell className="font-mono text-xs">#{order.id}</TableCell>
                                                    <TableCell>{(order as any).outlets?.name || 'N/A'}</TableCell>
                                                    <TableCell className="hidden sm:table-cell">{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
                                                    <TableCell className="hidden md:table-cell"><Badge variant={getPaymentStatusVariant(order.payment_status)}>{order.payment_status}</Badge></TableCell>
                                                    <TableCell className="text-right">₹{order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-right">₹{order.amount_paid?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-right font-medium">₹{balanceDue.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <RecordPaymentDialog order={order} onPaymentRecorded={fetchPaymentData} />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {/* Mobile Card View */}
                            <div className="grid gap-4 md:hidden">
                                {orders.map((order) => {
                                     const balanceDue = order.total_amount - (order.amount_paid || 0);
                                     return (
                                        <Card key={order.id} className="w-full">
                                            <CardHeader>
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <CardTitle className="text-base">{(order as any).outlets?.name || 'N/A'}</CardTitle>
                                                        <CardDescription>Order #{order.id} &bull; {format(new Date(order.order_date), 'MMM d, yyyy')}</CardDescription>
                                                    </div>
                                                    <Badge variant={getPaymentStatusVariant(order.payment_status)}>{order.payment_status}</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="grid gap-4">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">Total Value</span>
                                                    <span className="font-medium">₹{order.total_amount?.toFixed(2) || '0.00'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">Amount Paid</span>
                                                    <span className="font-medium">₹{order.amount_paid?.toFixed(2) || '0.00'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-base">
                                                    <span className="text-muted-foreground">Balance Due</span>
                                                    <span className="font-bold text-destructive">₹{balanceDue.toFixed(2)}</span>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <RecordPaymentDialog order={order} onPaymentRecorded={fetchPaymentData} />
                                            </CardFooter>
                                        </Card>
                                     );
                                })}
                            </div>

                        </>
                    ) : (
                         <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
                            No orders requiring payment found.
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-end items-center gap-4 border-t bg-muted/50 px-6 py-4">
                    <div className="text-lg font-semibold">Total Outstanding Dues:</div>
                    <div className="text-2xl font-bold text-destructive">₹{totalDues.toFixed(2)}</div>
                </CardFooter>
            </Card>
        </main>
    );
}
