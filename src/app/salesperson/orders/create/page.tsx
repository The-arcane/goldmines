
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { Outlet, Sku, Distributor } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Trash2, PlusCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createNewOrder } from "@/lib/actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
    outlet_id: z.string().min(1, "Please select an outlet."),
    items: z.array(z.object({
        sku_id: z.coerce.number().min(1, "SKU must be selected."),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
        unit_price: z.number(),
        total_price: z.number(),
    })).min(1, "Please add at least one item to the order."),
});

type OrderFormValues = z.infer<typeof formSchema>;

export default function CreateOrderPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [activeOutlets, setActiveOutlets] = useState<Outlet[]>([]);
    const [skus, setSkus] = useState<Sku[]>([]);
    const [loading, setLoading] = useState(true);

    const form = useForm<OrderFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { outlet_id: "", items: [] },
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        // 1. Check for all active visits (no exit_time)
        const { data: activeVisitsData, error: visitError } = await supabase
            .from('visits')
            .select('outlet_id')
            .eq('user_id', user.id)
            .is('exit_time', null);

        if (visitError || !activeVisitsData || activeVisitsData.length === 0) {
            console.log("No active visit found for user.");
            setActiveOutlets([]);
            setLoading(false);
            return;
        }

        const activeOutletIds = activeVisitsData.map(v => v.outlet_id);

        // 2. Fetch the specific active outlets
        const { data: outletsData, error: outletError } = await supabase
            .from('outlets')
            .select('*')
            .in('id', activeOutletIds);
        
        if (outletError || !outletsData) {
             toast({ variant: "destructive", title: "Error", description: "Could not load the outlets you are currently visiting." });
             setLoading(false);
             return;
        }
        
        setActiveOutlets(outletsData);
        // Pre-fill form if there is only one active outlet
        if (outletsData.length === 1) {
            form.setValue('outlet_id', outletsData[0].id);
        }

        // 3. Find the distributor for the user
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('distributor_id:distributor_users!inner(distributor_id)')
            .eq('id', user.id)
            .single();

        if (userError || !userData || !(userData as any).distributor_id.length) {
             toast({ variant: "destructive", title: "Cannot create order", description: "You are not assigned to a distributor."});
             setLoading(false);
             return;
        }
        
        const distributorId = (userData as any).distributor_id[0].distributor_id;
        const { data: distributorData } = await supabase.from('distributors').select('*').eq('id', distributorId).single();

        if (distributorData) {
            setDistributor(distributorData);
            // 4. Fetch SKUs for that distributor
            const { data: skusRes } = await supabase.from("skus").select("*").or(`distributor_id.eq.${distributorData.id},distributor_id.is.null`);
            if(skusRes) setSkus(skusRes);
        }
        setLoading(false);
    }, [user, toast, form]);

    useEffect(() => { fetchData() }, [fetchData]);

    const watchedItems = form.watch("items");
    const totalValue = watchedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);

    const handleSkuChange = (index: number, skuId: string) => {
        const selectedSku = skus.find(s => s.id === parseInt(skuId));
        if (selectedSku) {
            const currentItem = form.getValues(`items.${index}`);
            update(index, { 
                ...currentItem, 
                sku_id: selectedSku.id, 
                unit_price: selectedSku.ptr || 0,
                total_price: (selectedSku.ptr || 0) * (currentItem.quantity || 1)
            });
        }
    };
    
    const handleQuantityChange = (index: number, quantity: string) => {
         const currentItem = form.getValues(`items.${index}`);
         const newQuantity = parseInt(quantity) || 0;
         update(index, {
            ...currentItem,
            quantity: newQuantity,
            total_price: (currentItem.unit_price || 0) * newQuantity
         });
    }

    const onSubmit = async (data: OrderFormValues) => {
        if (!distributor) return;
        
        const orderData = {
            ...data,
            total_value: totalValue
        };

        const result = await createNewOrder(orderData, distributor.id);
        if (result.success) {
            toast({ title: "Order Placed!", description: `Order #${result.orderId} has been sent for approval.` });
            router.push("/salesperson/dashboard");
        } else {
            toast({ variant: "destructive", title: "Failed to create order", description: result.error });
        }
    };

    if (loading) {
         return <div className="flex h-full w-full items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
    }

    if (activeOutlets.length === 0) {
        return (
             <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 items-center justify-center">
                 <Alert variant="destructive" className="max-w-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Active Visit Found</AlertTitle>
                    <AlertDescription>
                        You must check into an outlet before you can create an order. Please go to your dashboard and start a visit.
                    </AlertDescription>
                </Alert>
             </main>
        );
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid gap-4">
                        <div>
                            <h1 className="font-headline text-3xl font-bold">Create New Order</h1>
                            <p className="text-muted-foreground">Select an outlet and add products to the order.</p>
                        </div>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Outlet Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="outlet_id"
                                    render={({ field }) => (
                                        <FormItem className="max-w-sm">
                                            <FormLabel>Outlet</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={activeOutlets.length === 1}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select an active outlet" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {activeOutlets.map(outlet => <SelectItem key={outlet.id} value={String(outlet.id)}>{outlet.name}</SelectItem>)}
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
                                <CardDescription>Add the SKUs and quantities for this order.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50%]">SKU</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Unit Price</TableHead>
                                            <TableHead className="text-right">Total Price</TableHead>
                                            <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell>
                                                    <Controller
                                                        control={form.control}
                                                        name={`items.${index}.sku_id`}
                                                        render={({ field }) => (
                                                            <Select onValueChange={(value) => { field.onChange(value); handleSkuChange(index, value); }} defaultValue={String(field.value)}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a SKU" /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {skus.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
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
                                                <TableCell>₹{watchedItems[index]?.unit_price.toFixed(2) || '0.00'}</TableCell>
                                                <TableCell className="text-right">₹{watchedItems[index]?.total_price.toFixed(2) || '0.00'}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ sku_id: 0, quantity: 1, unit_price: 0, total_price: 0 })}>
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
                            <Button type="submit" size="lg" disabled={form.formState.isSubmitting || loading}>
                                {form.formState.isSubmitting ? "Placing Order..." : "Place Order for Approval"}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </main>
    );
}
