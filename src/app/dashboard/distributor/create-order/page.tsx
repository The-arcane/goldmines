
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
import { Trash2, PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createNewOrder } from "@/lib/actions";

const formSchema = z.object({
    items: z.array(z.object({
        sku_id: z.coerce.number().min(1, "SKU must be selected."),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1 case."),
        case_price: z.number(),
        total_price: z.number(),
    })).min(1, "Please add at least one item to the order."),
});

type OrderFormValues = z.infer<typeof formSchema>;

export default function CreateDistributorOrderPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [skus, setSkus] = useState<Sku[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, startTransition] = useTransition();

    const form = useForm<OrderFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { items: [] },
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { data: distData, error: distError } = await supabase
                .from('distributors')
                .select('*')
                .eq('admin_user_id', user.id)
                .single();

            if (distError || !distData) {
                toast({ variant: "destructive", title: "Error", description: "Could not find your distributor profile." });
                setLoading(false);
                return;
            }
            setDistributor(distData);

            // Distributor orders from Super Admin, so fetch all SKUs not assigned to any specific distributor
            const { data: skusData, error: skusError } = await supabase.from("skus").select("*").is('distributor_id', null);
            if (skusError) {
                toast({ variant: "destructive", title: "Error", description: "Could not fetch product list." });
            } else {
                setSkus(skusData || []);
            }
        } catch (e) {
             toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => { fetchData() }, [fetchData]);

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

    const onSubmit = (data: OrderFormValues) => {
        if (!distributor) return;
        
        startTransition(async () => {
            const orderData = {
                total_amount: totalValue,
                items: data.items.map(item => {
                    const skuDetails = getSkuDetails(item.sku_id);
                     const unitPrice = (skuDetails?.units_per_case || 1) > 0 ? (item.case_price || 0) / (skuDetails?.units_per_case || 1) : 0;
                    return {
                        sku_id: item.sku_id,
                        quantity: item.quantity * (skuDetails?.units_per_case || 1), // Convert cases to units
                        unit_price: unitPrice,
                        total_price: item.total_price,
                    }
                }),
                payment_status: 'Unpaid' as const,
            };

            const result = await createNewOrder(orderData, distributor.id, true); // `isDistributorOrder` = true
            if (result.success) {
                toast({ title: "Order Submitted!", description: `Your stock order #${result.orderId} has been sent for approval.` });
                router.push("/dashboard/distributor/orders");
            } else {
                toast({ variant: "destructive", title: "Failed to create order", description: result.error });
            }
        });
    };

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid gap-4">
                        <div>
                            <h1 className="font-headline text-3xl font-bold">Create Stock Order</h1>
                            <p className="text-muted-foreground">Order products from the main company to replenish your inventory.</p>
                        </div>
                        
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
                                                <TableHead className="w-[40%]">SKU</TableHead>
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
                                                                        {skus.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.units_per_case} units/case)</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </TableCell>
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
                                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ sku_id: 0, quantity: 1, case_price: 0, total_price: 0 })} disabled={loading}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                                </Button>
                                <FormMessage>{form.formState.errors.items?.message}</FormMessage>
                            </CardContent>
                        </Card>
                        
                        <div className="flex items-center justify-end gap-4">
                           <div className="text-right">
                                <p className="text-muted-foreground">Total Order Value</p>
                                <p className="text-2xl font-bold">₹{totalValue.toFixed(2)}</p>
                            </div>
                            <Button type="submit" size="lg" disabled={isSubmitting || loading}>
                                {isSubmitting ? "Submitting..." : "Submit Order to Admin"}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </main>
    );
}
