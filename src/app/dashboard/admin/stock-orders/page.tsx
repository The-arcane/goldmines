
"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { StockOrder } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateStockOrderStatus } from "@/lib/actions";

export default function AdminStockOrdersPage() {
    const [orders, setOrders] = useState<StockOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("stock_orders")
            .select("*, distributors(name)")
            .order("order_date", { ascending: false });

        if (error) {
            console.error("Error fetching stock orders:", error);
            setOrders([]);
        } else {
            setOrders(data as StockOrder[] || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Shipped': return 'default';
            case 'Pending': return 'destructive';
            case 'Rejected': return 'outline';
            case 'Approved': return 'secondary';
            default: return 'secondary';
        }
    }
    
    const handleStatusChange = (orderId: number, newStatus: string) => {
        startTransition(async () => {
            const result = await updateStockOrderStatus(orderId, newStatus);
            if(result.success) {
                toast({ title: `Order ${newStatus}`, description: `The stock order has been updated.`});
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
                        <CardTitle>Distributor Stock Orders</CardTitle>
                        <CardDescription>
                           Review and manage all incoming stock orders from distributors.
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
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Distributor</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono">#{order.id}</TableCell>
                                        <TableCell className="font-medium">{(order as any).distributors?.name || 'N/A'}</TableCell>
                                        <TableCell>{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                                        <TableCell className="text-right">₹{order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isPending}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        disabled={order.status !== 'Pending'}
                                                        onClick={() => handleStatusChange(order.id, 'Approved')}>
                                                        <CheckCircle className="mr-2 h-4 w-4" />Approve
                                                    </DropdownMenuItem>
                                                     <DropdownMenuItem 
                                                        disabled={order.status !== 'Pending'}
                                                        onClick={() => handleStatusChange(order.id, 'Rejected')}>
                                                        <XCircle className="mr-2 h-4 w-4" />Reject
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        disabled={order.status !== 'Approved'}
                                                        onClick={() => handleStatusChange(order.id, 'Shipped')}>
                                                        <Truck className="mr-2 h-4 w-4" />Mark as Shipped
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
