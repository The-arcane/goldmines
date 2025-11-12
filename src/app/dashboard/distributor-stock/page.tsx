
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { DistributorStock, Distributor } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function DistributorStockPage() {
    const { user } = useAuth();
    const [distributorStock, setDistributorStock] = useState<DistributorStock[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [selectedDistributor, setSelectedDistributor] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [loadingStock, setLoadingStock] = useState(false);

    const fetchInitialData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const { data: distributorData } = await supabase.from('distributors').select('*');
        if (distributorData) {
            setDistributors(distributorData);
            if (distributorData.length > 0) {
                const firstDistributorId = String(distributorData[0].id);
                setSelectedDistributor(firstDistributorId);
                await fetchStock(firstDistributorId);
            }
        }
        setLoading(false);
    }, [user]);

    const fetchStock = async (distributorId: string) => {
        if (!distributorId) {
            setDistributorStock([]);
            return;
        };

        setLoadingStock(true);
        const { data, error } = await supabase
            .from('distributor_stock')
            .select('*, skus!inner(*)')
            .eq('distributor_id', parseInt(distributorId, 10));
        
        if (error) {
            console.error("Error fetching distributor stock:", error);
            setDistributorStock([]);
        } else {
            setDistributorStock(data || []);
        }
        setLoadingStock(false);
    }
    
    useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user, fetchInitialData]);

    const handleDistributorChange = (distributorId: string) => {
        setSelectedDistributor(distributorId);
        fetchStock(distributorId);
    }

    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="grid gap-2 flex-grow">
                        <CardTitle>Distributor Stock</CardTitle>
                        <CardDescription>
                           View live inventory levels for each distributor.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Select onValueChange={handleDistributorChange} value={selectedDistributor} disabled={loading}>
                            <SelectTrigger className="w-full sm:w-[250px]">
                                <SelectValue placeholder="Select a distributor" />
                            </SelectTrigger>
                            <SelectContent>
                                {distributors.map(d => (
                                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingStock ? (
                       <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                       </div>
                    ) : (
                       <DistributorStockTable stock={distributorStock} />
                    )}
                </CardContent>
            </Card>
        </main>
    );
}

function DistributorStockTable({ stock }: { stock: DistributorStock[] }) {
    if (stock.length === 0) {
        return (
            <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
               This distributor has no stock records, or no distributor is selected.
            </div>
        );
    }
     return (
        <>
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead>SKU Code</TableHead>
                            <TableHead className="text-right">Stock (Units)</TableHead>
                            <TableHead>Unit Type</TableHead>
                            <TableHead className="text-right">Units/Case</TableHead>
                            <TableHead className="text-right">Case Price (₹)</TableHead>
                            <TableHead className="text-right">MRP (₹)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stock.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.skus.name}</TableCell>
                                <TableCell>{item.skus.product_code || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={item.stock_quantity < 10 ? 'destructive' : 'secondary'}>
                                        {item.stock_quantity}
                                    </Badge>
                                </TableCell>
                                <TableCell>{item.skus.unit_type || 'N/A'}</TableCell>
                                <TableCell className="text-right">{item.units_per_case || 'N/A'}</TableCell>
                                <TableCell className="text-right">₹{item.case_price?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell className="text-right">₹{item.mrp?.toFixed(2) || '0.00'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
             <div className="grid gap-4 md:hidden">
                {stock.map((item) => (
                    <Card key={item.id}>
                        <CardHeader>
                            <CardTitle className="text-base">{item.skus.name}</CardTitle>
                            <CardDescription>SKU: {item.skus.product_code || 'N/A'}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Stock</p>
                                <Badge variant={item.stock_quantity < 10 ? 'destructive' : 'secondary'}>
                                    {item.stock_quantity}
                                </Badge>
                            </div>
                             <div className="space-y-1 text-right">
                                <p className="text-muted-foreground">Unit Type</p>
                                <p>{item.skus.unit_type || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Units/Case</p>
                                <p>{item.units_per_case || 'N/A'}</p>
                            </div>
                             <div className="space-y-1 text-right">
                                <p className="text-muted-foreground">MRP</p>
                                <p className="font-semibold">₹{item.mrp?.toFixed(2) || '0.00'}</p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <div className="w-full space-y-1 text-sm">
                                <p className="text-muted-foreground">Case Price</p>
                                <p className="font-semibold text-base">₹{item.case_price?.toFixed(2) || '0.00'}</p>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </>
    )
}
