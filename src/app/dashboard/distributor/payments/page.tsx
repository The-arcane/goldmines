
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Order, Distributor } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { RecordPaymentDialog } from "@/components/dashboard/distributor/record-payment-dialog";

export default function PaymentsPage() {
    const { user } = useAuth();
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
            .order("created_at", { ascending: false });

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
    }, [user, fetchPaymentData]);

    const totalDues = useMemo(() => {
        return orders.reduce((sum, order) => {
            const due = (order.total_value || 0) - (order.amount_paid || 0);
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
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
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
                        <div className="text-center p-8">Loading payment data...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Outlet</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Payment Status</TableHead>
                                    <TableHead className="text-right">Total Value</TableHead>
                                    <TableHead className="text-right">Amount Paid</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.length > 0 ? orders.map((order) => {
                                    const balanceDue = order.total_value - (order.amount_paid || 0);
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono">#{order.id}</TableCell>
                                            <TableCell>{(order as any).outlets?.name || 'N/A'}</TableCell>
                                            <TableCell>{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell><Badge variant={getPaymentStatusVariant(order.payment_status)}>{order.payment_status}</Badge></TableCell>
                                            <TableCell className="text-right">₹{order.total_value?.toFixed(2) || '0.00'}</TableCell>
                                            <TableCell className="text-right">₹{order.amount_paid?.toFixed(2) || '0.00'}</TableCell>
                                            <TableCell className="text-right font-medium">₹{balanceDue.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <RecordPaymentDialog order={order} onPaymentRecorded={fetchPaymentData} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                     <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground p-8">
                                            No orders requiring payment found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end items-center gap-4 border-t bg-muted/50 px-6 py-4">
                    <div className="text-lg font-semibold">Total Outstanding Dues:</div>
                    <div className="text-2xl font-bold text-destructive">₹{totalDues.toFixed(2)}</div>
                </CardFooter>
            </Card>
        </main>
    );
}
