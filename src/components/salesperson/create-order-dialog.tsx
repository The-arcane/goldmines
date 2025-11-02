
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
        unit_price: z.number(),
        total_price: z.number(),
    })).min(1, "Please add at least one item to the order."),
});

type OrderFormValues = z.infer<typeof formSchema>;

export function CreateOrderDialog({ outlet }: { outlet: Outlet }) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [skus, setSkus] = useState<Sku[]>([]);
    const [loading, setLoading] = useState(true);

    const form = useForm<OrderFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { items: [] },
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const fetchData = useCallback(async () => {
        if (!user || !open) return;
        setLoading(true);

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
            const { data: skusRes } = await supabase.from("skus").select("*").or(`distributor_id.eq.${distributorData.id},distributor_id.is.null`);
            if(skusRes) setSkus(skusRes);
        }
        setLoading(false);
    }, [user, open, toast]);

    useEffect(() => { fetchData() }, [fetchData]);
    
    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            form.reset({ items: [] });
        }
    }, [open, form]);

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
            outlet_id: outlet.id,
            total_value: totalValue
        };

        const result = await createNewOrder(orderData, distributor.id);
        if (result.success) {
            toast({ title: "Order Placed!", description: `Order #${result.orderId} for ${outlet.name} has been sent.` });
            setOpen(false);
        } else {
            toast({ variant: "destructive", title: "Failed to create order", description: result.error });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Order</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>New Order for: {outlet.name}</DialogTitle>
                            <DialogDescription>Add products to the order. Click save when you're done.</DialogDescription>
                        </DialogHeader>

                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                             <div className="py-4">
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
                            </div>
                        )}
                        
                        <DialogFooter className="mt-4">
                            <div className="flex items-center gap-4 w-full justify-end">
                                <div className="text-right">
                                    <p className="text-muted-foreground">Total Order Value</p>
                                    <p className="text-2xl font-bold">₹{totalValue.toFixed(2)}</p>
                                </div>
                                <Button type="submit" size="lg" disabled={form.formState.isSubmitting || loading}>
                                    {form.formState.isSubmitting ? "Placing Order..." : "Place Order"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
