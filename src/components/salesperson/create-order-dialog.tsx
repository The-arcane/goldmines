
"use client";

import { useEffect, useState, useCallback } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
    items: z.array(z.object({
        sku_id: z.coerce.number().min(1, "SKU must be selected."),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1 case."),
        case_price: z.number(),
        total_price: z.number(),
    })).min(1, "Please add at least one item to the order."),
    payment_status: z.enum(["Unpaid", "Partially Paid", "Paid"]),
    amount_paid: z.coerce.number().optional(),
}).refine(data => {
    if (data.payment_status === 'Partially Paid') {
        return data.amount_paid !== undefined && data.amount_paid > 0;
    }
    return true;
}, {
    message: "Please enter the amount for partial payment.",
    path: ["amount_paid"],
});

type OrderFormValues = z.infer<typeof formSchema>;

type CreateOrderDialogProps = {
    outlet: Outlet;
    onOrderPlaced: () => void;
}

export function CreateOrderDialog({ outlet, onOrderPlaced }: CreateOrderDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [skus, setSkus] = useState<Sku[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<OrderFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { items: [], payment_status: "Unpaid" },
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const fetchData = useCallback(async () => {
        if (!user || !open) return;
        setLoading(true);
        setError(null);

        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('distributor_id:distributor_users!inner(distributor_id)')
                .eq('id', user.id)
                .single();

            if (userError || !userData || !(userData as any).distributor_id.length) {
                throw new Error("You are not assigned to a distributor.");
            }
            
            const distributorId = (userData as any).distributor_id[0].distributor_id;
            const { data: distributorData, error: distError } = await supabase.from('distributors').select('*').eq('id', distributorId).single();

            if (distError || !distributorData) {
                throw new Error("Could not load distributor information.");
            }
            setDistributor(distributorData);

            const { data: skusRes, error: skusError } = await supabase.from("skus").select("*").or(`distributor_id.eq.${distributorData.id},distributor_id.is.null`);
            
            if (skusError) {
                throw new Error("Could not load product SKUs.");
            }
            setSkus(skusRes || []);

        } catch (e: any) {
            const errorMessage = e.message || "An unexpected error occurred.";
            toast({ variant: "destructive", title: "Cannot Create Order", description: errorMessage });
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [user, open, toast]);

    useEffect(() => { fetchData() }, [fetchData]);
    
    useEffect(() => {
        if (!open) {
            form.reset({ items: [], payment_status: "Unpaid", amount_paid: 0 });
            setLoading(false);
            setError(null);
        }
    }, [open, form]);

    const watchedItems = form.watch("items");
    const watchedPaymentStatus = form.watch("payment_status");
    const totalAmount = watchedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);

    const handleSkuChange = (index: number, skuId: string) => {
        const selectedSku = skus.find(s => s.id === parseInt(skuId));
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
    
    const getSkuDetails = (skuId: number) => skus.find(s => s.id === skuId);

    const onSubmit = async (data: OrderFormValues) => {
        if (!distributor) {
            toast({ variant: "destructive", title: "Error", description: "Distributor information is missing." });
            return;
        }

        let amountPaid = 0;
        if (data.payment_status === 'Paid') {
            amountPaid = totalAmount;
        } else if (data.payment_status === 'Partially Paid') {
            amountPaid = data.amount_paid || 0;
        }

        if (data.payment_status === 'Partially Paid' && amountPaid >= totalAmount) {
            form.setError("amount_paid", { message: "Partial payment cannot be equal to or exceed the total amount." });
            return;
        }
        
        const orderData = {
            outlet_id: outlet.id,
            total_amount: totalAmount,
            amount_paid: amountPaid,
            payment_status: data.payment_status,
            items: data.items.map(item => {
                const skuDetails = getSkuDetails(item.sku_id);
                 const unitPrice = (skuDetails?.units_per_case || 1) > 0 ? (item.case_price || 0) / (skuDetails?.units_per_case || 1) : 0;
                return {
                    sku_id: item.sku_id,
                    quantity: item.quantity * (skuDetails?.units_per_case || 1), 
                    unit_price: unitPrice,
                    total_price: item.total_price,
                }
            })
        };

        const result = await createNewOrder(orderData, distributor.id);
        if (result.success) {
            toast({ title: "Order Placed!", description: `Order #${result.orderId} for ${outlet.name} has been placed.` });
            onOrderPlaced(); // Re-fetch dashboard data
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
            <DialogContent className="sm:max-w-6xl">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>New Order for: {outlet.name}</DialogTitle>
                            <DialogDescription>Add products and payment details. Click save when you're done.</DialogDescription>
                        </DialogHeader>

                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="flex h-64 items-center justify-center text-center text-destructive bg-destructive/10 rounded-md p-4">
                                <div>
                                    <p className="font-bold">Could not load order form</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            </div>
                        ) : (
                             <div className="py-4 space-y-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[30%]">SKU</TableHead>
                                            <TableHead className="w-[120px]">Qty (Cases)</TableHead>
                                            <TableHead className="text-right">Units/Case</TableHead>
                                            <TableHead className="text-right">MRP</TableHead>
                                            <TableHead className="text-right">Per Item Cost</TableHead>
                                            <TableHead className="text-right font-medium">Case Price</TableHead>
                                            <TableHead className="text-right font-medium">Total Price</TableHead>
                                            <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => {
                                            const skuDetails = getSkuDetails(watchedItems[index]?.sku_id);
                                            const perItemCost = skuDetails && skuDetails.case_price && skuDetails.units_per_case 
                                                ? skuDetails.case_price / skuDetails.units_per_case 
                                                : 0;
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
                                                                <Input type="number" {...field} onChange={(e) => { field.onChange(e); handleQuantityChange(index, e.target.value); }} placeholder="Cases" />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">{skuDetails?.units_per_case || 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-mono">₹{skuDetails?.mrp?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-right font-mono">₹{perItemCost.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono font-medium">₹{skuDetails?.case_price?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-right font-mono font-medium">₹{watchedItems[index]?.total_price.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ sku_id: 0, quantity: 1, case_price: 0, total_price: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                                </Button>
                                <FormMessage>{form.formState.errors.items?.message}</FormMessage>
                                
                                <Separator className="my-4" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <FormField
                                        control={form.control}
                                        name="payment_status"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>Payment Status</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex flex-col space-y-1"
                                                    >
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Unpaid" /></FormControl>
                                                        <FormLabel className="font-normal">Unpaid</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Paid" /></FormControl>
                                                        <FormLabel className="font-normal">Fully Paid (₹{totalAmount.toFixed(2)})</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Partially Paid" /></FormControl>
                                                        <FormLabel className="font-normal">Partially Paid</FormLabel>
                                                    </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {watchedPaymentStatus === 'Partially Paid' && (
                                        <FormField
                                            control={form.control}
                                            name="amount_paid"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Amount Paid</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="Enter amount" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <DialogFooter className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-4 w-full justify-end">
                                <div className="text-right">
                                    <p className="text-muted-foreground">Total Order Value</p>
                                    <p className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</p>
                                </div>
                                <Button type="submit" size="lg" disabled={form.formState.isSubmitting || loading || !!error || fields.length === 0}>
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
