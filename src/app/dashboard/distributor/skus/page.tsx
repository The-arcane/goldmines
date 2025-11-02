
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Sku, Distributor } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddSkuDialog } from "@/components/dashboard/distributor/add-sku-dialog";

export default function SkusPage() {
    const { user } = useAuth();
    const [skus, setSkus] = useState<Sku[]>([]);
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSkus = useCallback(async () => {
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
            .from("skus")
            .select("*")
            .or(`distributor_id.eq.${distributorData.id},distributor_id.is.null`)
            .order("name", { ascending: true });

        if (error) {
            console.error("Error fetching SKUs:", error);
        } else {
            setSkus(data || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchSkus();
        }
    }, [user, fetchSkus]);

    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>SKU & Inventory Management</CardTitle>
                        <CardDescription>
                           A list of all products in your inventory.
                        </CardDescription>
                    </div>
                    <div className="ml-auto">
                        {distributor && (
                            <AddSkuDialog 
                                onSkuAdded={fetchSkus} 
                                distributorId={distributor.id} 
                            />
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading SKUs...</div>
                    ) : skus.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>SKU Code</TableHead>
                                            <TableHead className="text-right">Stock</TableHead>
                                            <TableHead>Unit</TableHead>
                                            <TableHead className="text-right">Units/Case</TableHead>
                                            <TableHead className="text-right">Case Price</TableHead>
                                            <TableHead className="text-right">Per Item Cost</TableHead>
                                            <TableHead className="text-right">MRP</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {skus.map((sku) => {
                                            const perItemCost = (sku.case_price && sku.units_per_case && sku.units_per_case > 0) 
                                                ? sku.case_price / sku.units_per_case 
                                                : 0;

                                            return (
                                                <TableRow key={sku.id}>
                                                    <TableCell className="font-medium">{sku.name}</TableCell>
                                                    <TableCell>{sku.product_code || 'N/A'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={sku.stock_quantity < 10 ? 'destructive' : 'secondary'}>
                                                            {sku.stock_quantity}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{sku.unit_type || 'N/A'}</TableCell>
                                                    <TableCell className="text-right">{sku.units_per_case || 'N/A'}</TableCell>
                                                    <TableCell className="text-right">₹{sku.case_price?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-right">₹{perItemCost.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">₹{sku.mrp?.toFixed(2) || '0.00'}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {/* Mobile Card View */}
                            <div className="grid gap-4 md:hidden">
                                {skus.map((sku) => {
                                    const perItemCost = (sku.case_price && sku.units_per_case && sku.units_per_case > 0) 
                                        ? sku.case_price / sku.units_per_case 
                                        : 0;

                                    return (
                                        <Card key={sku.id}>
                                            <CardHeader>
                                                <CardTitle className="text-base">{sku.name}</CardTitle>
                                                <CardDescription>SKU: {sku.product_code || 'N/A'}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="grid gap-4 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Stock</span>
                                                    <Badge variant={sku.stock_quantity < 10 ? 'destructive' : 'secondary'}>
                                                        {sku.stock_quantity}
                                                    </Badge>
                                                </div>
                                                 <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Unit Type</span>
                                                    <span>{sku.unit_type || 'N/A'}</span>
                                                </div>
                                                 <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Units/Case</span>
                                                    <span>{sku.units_per_case || 'N/A'}</span>
                                                </div>
                                                 <div className="flex justify-between font-medium">
                                                    <span className="text-muted-foreground">Case Price</span>
                                                    <span>₹{sku.case_price?.toFixed(2) || '0.00'}</span>
                                                </div>
                                                <div className="flex justify-between font-medium">
                                                    <span className="text-muted-foreground">Per Item Cost</span>
                                                    <span>₹{perItemCost.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between font-medium">
                                                    <span className="text-muted-foreground">MRP</span>
                                                    <span>₹{sku.mrp?.toFixed(2) || '0.00'}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
                            No SKUs found. Add one to get started.
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
