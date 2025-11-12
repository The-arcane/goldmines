
"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { Sku, Distributor } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createStockOrder } from "@/lib/actions";

const formSchema = z.object({
    distributor_id: z.string().min(1, "Please select a distributor."),
    items: z.array(z.object({
        sku_id: z.coerce.number().min(1, "SKU must be selected."),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1 case."),
        case_price: z.number(),
        total_price: z.number(),
    })).min(1, "Please add at least one item to the order."),
    notes: z.string().optional(),
});

type StockOrderFormValues = z.infer<typeof formSchema>;

export default function AdminCreateStockOrderPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [skus, setSkus] = useState<Sku[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, startTransition] = useTransition();

    const form = useForm<StockOrderFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { distributor_id: "", items: [] },
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            const distPromise = supabase.from('distributors').select('*');
            const skusPromise = supabase.from("skus").select("*").is('distributor_id', null);

            const [distRes, skusRes] = await Promise.all([distPromise, skusPromise]);
            
            if (distRes.data) setDistributors(distRes.data);
            if (skusRes.data) setSkus(skusRes.data);
            
        } catch (e) {
             toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred while fetching data." });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => { 
        if(user) {
            fetchData();
        }
    }, [fetchData, user]);

    const watchedItems = form.watch("items");
    const totalValue = watchedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    
    const getSkuDetails = (skuId: number) => skus.find(s => s.id === skuId);

    const handleSkuChange = (index: number, skuId: string) => {
        const selectedSku = getSkuDetails(parseInt(skuId));
        if (selectedSku) {
            const currentItem = form.getValues(`items.${index}`);
            const casePrice = selectedSku.case_price || 0;
            update(index, { 
                ...currentItem, 
                sku_id: selectedSku.id, 
                case_price: casePrice,
                total_price: casePrice * (currentItem.quantity || 1)
            });
        }
    };
    
    const handleQuantityChange = (index: number, quantity: string) => {
         const currentItem = form.getValues(`items.${index}`);
         const newQuantity = parseInt(quantity) || 0;
         update(index, {
            ...currentItem,
            quantity: newQuantity,
            total_price: (currentItem.case_price || 0) * newQuantity
         });
    }

    const handleAddAllSkus = () => {
        const existingSkuIds = new Set(watchedItems.map(item => item.sku_id));
        const newItems = skus
            .filter(sku => !existingSkuIds.has(sku.id))
            .map(sku => {
                const casePrice = sku.case_price || 0;
                return {
                    sku_id: sku.id,
                    quantity: 1,
                    case_price: casePrice,
                    total_price: casePrice * 1,
                };
            });

        if (newItems.length > 0) {
            append(newItems);
        } else {
            toast({ title: "No new SKUs to add", description: "All available master SKUs are already in the order." });
        }
    };

    const onSubmit = (data: StockOrderFormValues) => {
        const distributorId = parseInt(data.distributor_id);
        if (!distributorId) {
             toast({ variant: "destructive", title: "Error", description: "Invalid distributor selected." });
            return
        };
        
        startTransition(async () => {
            const stockOrderData = {
                total_amount: totalValue,
                notes: data.notes,
                items: data.items.map(item => ({
                    sku_id: item.sku_id,
                    quantity: item.quantity,
                    case_price: item.case_price,
                    total_price: item.total_price,
                })),
            };

            const result = await createStockOrder(stockOrderData, distributorId);
            if (result.success) {
                toast({ title: "Stock Order Submitted!", description: `Stock order #${result.stockOrderId} has been placed for the distributor.` });
                router.push("/dashboard/admin/stock-orders");
            } else {
                toast({ variant: "destructive", title: "Failed to create stock order", description: result.error });
            }
        });
    };

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
                        <div>
                            <h1 className="font-headline text-3xl font-bold">Create Stock Order for Distributor</h1>
                            <p className="text-muted-foreground">Order products from the main company to replenish a distributor's inventory.</p>
                        </div>
                        
                         <Card>
                            <CardHeader>
                                <CardTitle>Distributor</CardTitle>
                                <CardDescription>Select the distributor to place this stock order for.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <FormField
                                    control={form.control}
                                    name="distributor_id"
                                    render={({ field }) => (
                                        <FormItem className="max-w-sm">
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a distributor" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {distributors.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Items</CardTitle>
                                <CardDescription>Add the SKUs and quantities (in cases) for this stock order.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center items-center h-24">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[35%]">SKU</TableHead>
                                                <TableHead className="text-center">Units/Case</TableHead>
                                                <TableHead>Qty (Cases)</TableHead>
                                                <TableHead className="text-right">Case Price</TableHead>
                                                <TableHead className="text-right">Total Price</TableHead>
                                                <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((field, index) => {
                                                const skuDetails = getSkuDetails(watchedItems[index]?.sku_id);
                                                return (
                                                <TableRow key={field.id}>
                                                    <TableCell>
                                                        <Controller
                                                            control={form.control}
                                                            name={`items.${index}.sku_id`}
                                                            render={({ field }) => (
                                                                <Select onValueChange={(value) => { field.onChange(value); handleSkuChange(index, value); }} defaultValue={String(field.value)}>
                                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a SKU" /></SelectTrigger></FormControl>
                                                                    <SelectContent>
                                                                        {skus.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}{s.unit_type ? ` (${s.unit_type})` : ''}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center">{skuDetails?.units_per_case || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Controller
                                                            control={form.control}
                                                            name={`items.${index}.quantity`}
                                                            render={({ field }) => (
                                                                <Input type="number" {...field} onChange={(e) => { field.onChange(e); handleQuantityChange(index, e.target.value); }} />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">₹{skuDetails?.case_price?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-right font-mono">₹{watchedItems[index]?.total_price.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )})}
                                        </TableBody>
                                    </Table>
                                )}
                                <div className="flex gap-2 mt-4">
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ sku_id: 0, quantity: 1, case_price: 0, total_price: 0 })} disabled={loading}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" onClick={handleAddAllSkus} disabled={loading || skus.length === 0}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add All SKUs
                                    </Button>
                                </div>
                                <FormMessage>{form.formState.errors.items?.message}</FormMessage>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
                                <CardDescription>Add any special instructions or notes for this order.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea placeholder="e.g., Please expedite shipping." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        
                        <div className="flex items-center justify-end gap-4">
                           <div className="text-right">
                                <p className="text-muted-foreground">Total Order Value</p>
                                <p className="text-2xl font-bold">₹{totalValue.toFixed(2)}</p>
                            </div>
                            <Button type="submit" size="lg" disabled={isSubmitting || loading}>
                                {isSubmitting ? "Submitting..." : "Submit Order"}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </main>
    );
}
