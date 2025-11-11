
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Sku } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { AddSkuDialog } from "@/components/dashboard/skus/add-sku-dialog";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditSkuDialog } from "@/components/dashboard/skus/edit-sku-dialog";
import { DeleteSkuAlert } from "@/components/dashboard/skus/delete-sku-alert";
import { Skeleton } from "@/components/ui/skeleton";


export default function SkusPage() {
    const { user } = useAuth();
    const [skus, setSkus] = useState<Sku[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from("skus")
            .select("*")
            .is('distributor_id', null)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching SKUs:", error);
        } else {
            setSkus(data || []);
        }
        
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]);


    return (
        <main className="flex flex-1 flex-col gap-4 md:gap-8">
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="grid gap-2 flex-grow">
                        <CardTitle>Master SKUs & Inventory</CardTitle>
                        <CardDescription>
                           A list of all master products available to be ordered by distributors.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <AddSkuDialog onSkuAdded={fetchData} />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                       <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                       </div>
                    ) : (
                       <MasterSkuTable skus={skus} onDataChange={fetchData} />
                    )}
                </CardContent>
            </Card>
        </main>
    );
}


function MasterSkuTable({ skus, onDataChange }: { skus: Sku[], onDataChange: () => void }) {
    if (skus.length === 0) {
        return (
            <div className="text-center text-muted-foreground p-8 border-dashed border-2 rounded-md">
                No master SKUs found. Add one to get started.
            </div>
        );
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU Code</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Units/Case</TableHead>
                    <TableHead className="text-right">Case Price</TableHead>
                    <TableHead className="text-right">MRP</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {skus.map((sku) => (
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
                        <TableCell className="text-right">₹{sku.mrp?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <EditSkuDialog sku={sku} onSkuUpdated={onDataChange}>
                                        <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left">
                                            Edit
                                        </button>
                                    </EditSkuDialog>
                                    <DeleteSkuAlert sku={sku} onSkuDeleted={onDataChange}>
                                        <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left text-destructive">
                                            Delete
                                        </button>
                                    </DeleteSkuAlert>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
