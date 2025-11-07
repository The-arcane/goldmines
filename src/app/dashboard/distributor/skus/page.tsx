
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { DistributorStock, Distributor } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddSkuDialog } from "@/components/dashboard/distributor/add-sku-dialog";
import { useTranslation } from "@/components/i18n/provider";

export default function SkusPage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [distributorStock, setDistributorStock] = useState<DistributorStock[]>([]);
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
            .from("distributor_stock")
            .select("*, skus(name, product_code, unit_type)")
            .eq('distributor_id', distributorData.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching distributor stock:", error);
        } else {
            setDistributorStock(data || []);
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
                        <CardTitle>{t('SKU Management')}</CardTitle>
                        <CardDescription>
                           {t('A list of all products in your inventory.')}
                        </CardDescription>
                    </div>
                    {/* The ability for a distributor to add a base SKU might need to be re-evaluated.
                        For now, disabling it as they receive stock from the brand.
                    <div className="ml-auto">
                        {distributor && (
                            <AddSkuDialog 
                                onSkuAdded={fetchSkus} 
                                distributorId={distributor.id} 
                            />
                        )}
                    </div>
                    */}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading your inventory...</div>
                    ) : distributorStock.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Product Name')}</TableHead>
                                            <TableHead>{t('SKU Code')}</TableHead>
                                            <TableHead className="text-right">{t('Stock')}</TableHead>
                                            <TableHead>{t('Unit')}</TableHead>
                                            <TableHead className="text-right">{t('Units/Case')}</TableHead>
                                            <TableHead className="text-right">{t('Case Price')}</TableHead>
                                            <TableHead className="text-right">{t('Per Item Cost')}</TableHead>
                                            <TableHead className="text-right">{t('MRP')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {distributorStock.map((stockItem) => {
                                            const perItemCost = (stockItem.case_price && stockItem.units_per_case && stockItem.units_per_case > 0) 
                                                ? stockItem.case_price / stockItem.units_per_case 
                                                : 0;

                                            return (
                                                <TableRow key={stockItem.id}>
                                                    <TableCell className="font-medium">{stockItem.skus?.name}</TableCell>
                                                    <TableCell>{stockItem.skus?.product_code || 'N/A'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={stockItem.stock_quantity < 10 ? 'destructive' : 'secondary'}>
                                                            {stockItem.stock_quantity}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{stockItem.skus?.unit_type || 'N/A'}</TableCell>
                                                    <TableCell className="text-right">{stockItem.units_per_case || 'N/A'}</TableCell>
                                                    <TableCell className="text-right">₹{stockItem.case_price?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-right">₹{perItemCost.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">₹{stockItem.mrp?.toFixed(2) || '0.00'}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {/* Mobile Card View */}
                            <div className="grid gap-4 md:hidden">
                                {distributorStock.map((stockItem) => {
                                    const perItemCost = (stockItem.case_price && stockItem.units_per_case && stockItem.units_per_case > 0) 
                                        ? stockItem.case_price / stockItem.units_per_case 
                                        : 0;

                                    return (
                                        <Card key={stockItem.id}>
                                            <CardHeader>
                                                <CardTitle className="text-base">{stockItem.skus?.name}</CardTitle>
                                                <CardDescription>SKU: {stockItem.skus?.product_code || 'N/A'}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="grid gap-4 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t('Stock')}</span>
                                                    <Badge variant={stockItem.stock_quantity < 10 ? 'destructive' : 'secondary'}>
                                                        {stockItem.stock_quantity}
                                                    </Badge>
                                                </div>
                                                 <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t('Unit')}</span>
                                                    <span>{stockItem.skus?.unit_type || 'N/A'}</span>
                                                </div>
                                                 <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t('Units/Case')}</span>
                                                    <span>{stockItem.units_per_case || 'N/A'}</span>
                                                </div>
                                                 <div className="flex justify-between font-medium">
                                                    <span className="text-muted-foreground">{t('Case Price')}</span>
                                                    <span>₹{stockItem.case_price?.toFixed(2) || '0.00'}</span>
                                                </div>
                                                <div className="flex justify-between font-medium">
                                                    <span className="text-muted-foreground">{t('Per Item Cost')}</span>
                                                    <span>₹{perItemCost.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between font-medium">
                                                    <span className="text-muted-foreground">{t('MRP')}</span>
                                                    <span>₹{stockItem.mrp?.toFixed(2) || '0.00'}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
                            {t('No SKUs found. Add one to get started.')}
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
