
"use client";

import { useEffect, useState, useCallback, useMemo, useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { Outlet, DistributorStock } from "@/lib/types";
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
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Trash2, PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createNewOrder } from "@/lib/actions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
    items: z.array(z.object({
        sku_id: z.coerce.number().min(1, "SKU must be selected."),
        order_unit_type: z.enum(['units', 'cases']).default('units'),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
        unit_price: z.number(),
        total_price: z.number(),
        scheme_discount_percentage: z.number().default(0),
        apply_scheme: z.boolean().default(true),
        available_stock: z.number(),
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
    disabled?: boolean;
}

export function CreateOrderDialog({ outlet, onOrderPlaced, disabled }: CreateOrderDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [distributorStock, setDistributorStock] = useState<DistributorStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, startTransition] = useTransition();
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
      if (!user) return;
      setLoading(true);
      setError(null);
  
      try {
        const { data: distributorLink, error: distributorLinkError } = await supabase
          .from('distributor_users')
          .select('distributor_id')
          .eq('user_id', user.id)
          .single();
  
        if (distributorLinkError || !distributorLink) {
          throw new Error("You are not assigned to a distributor.");
        }
        
        const distributorId = distributorLink.distributor_id;
  
        const { data: stockData, error: stockError } = await supabase
          .from('distributor_stock')
          .select('*, skus!inner(*)')
          .eq('distributor_id', distributorId)
          .gt('stock_quantity', 0);
  
        if (stockError) {
          console.error("Stock fetch error:", stockError);
          throw new Error("Could not load the distributor's product stock.");
        }
        
        setDistributorStock(stockData || []);
  
      } catch (e: any) {
        const errorMessage = e.message || "An unexpected error occurred.";
        toast({ variant: "destructive", title: "Cannot Create Order", description: errorMessage });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }, [user, toast]);
    
    useEffect(() => {
      if (open && user) {
        fetchData();
      }
    }, [open, user, fetchData]);

    useEffect(() => {
        if (!open) {
            form.reset({ items: [], payment_status: "Unpaid", amount_paid: 0 });
            setLoading(true);
            setError(null);
        }
    }, [open, form]);

    const watchedItems = form.watch("items");
    const watchedPaymentStatus = form.watch("payment_status");
    
     const calculateItemTotals = (item: OrderFormValues['items'][number]) => {
        const stockInfo = distributorStock.find(s => s.sku_id === item.sku_id);
        if (!stockInfo || !stockInfo.mrp) {
            return { unit_price: 0, total_price: 0, scheme_discount_percentage: 0 };
        }

        let discountPercentage = 0;
        const perUnitPrice = stockInfo.ptr || (stockInfo.mrp / 1.3);
        let totalPrice = 0;
        
        if (item.order_unit_type === 'cases' && stockInfo.units_per_case) {
            const totalUnits = item.quantity * stockInfo.units_per_case;
            totalPrice = perUnitPrice * totalUnits;
            
            if (item.apply_scheme) {
                if (item.quantity >= 21) discountPercentage = 3;
                else if (item.quantity >= 6) discountPercentage = 2;
                else if (item.quantity >= 1) discountPercentage = 1;
            }
        } else {
            totalPrice = perUnitPrice * item.quantity;
            discountPercentage = 0;
        }
        
        return { unit_price: perUnitPrice, total_price: totalPrice, scheme_discount_percentage: discountPercentage };
    };

    const totals = useMemo(() => {
        return watchedItems.reduce((acc, item) => {
            const { total_price, scheme_discount_percentage } = calculateItemTotals(item);
            const discountAmount = (total_price || 0) * (scheme_discount_percentage / 100);
            const finalPrice = (total_price || 0) - discountAmount;
            
            acc.subtotal += total_price || 0;
            acc.totalDiscount += discountAmount;
            acc.finalTotal += finalPrice;
            
            return acc;
        }, { subtotal: 0, totalDiscount: 0, finalTotal: 0 });
    }, [watchedItems, distributorStock]);

    const updateItemCalculations = (index: number) => {
        const item = form.getValues(`items.${index}`);
        const stockInfo = distributorStock.find(s => s.sku_id === item.sku_id);
        const { unit_price, total_price, scheme_discount_percentage } = calculateItemTotals(item);

        update(index, {
            ...item,
            unit_price: unit_price,
            total_price: total_price,
            scheme_discount_percentage: scheme_discount_percentage,
            available_stock: stockInfo?.stock_quantity ?? 0,
        });
    };
    
    const handleFieldChange = (index: number, field: keyof OrderFormValues['items'][number], value: any) => {
        form.setValue(`items.${index}.${field}`, value);
        updateItemCalculations(index);
    }
    
    const handleSkuChange = (index: number, skuId: string) => {
        const newSkuId = parseInt(skuId, 10);
        const stockInfo = distributorStock.find(s => s.sku_id === newSkuId);
        form.setValue(`items.${index}.sku_id`, newSkuId);
        form.setValue(`items.${index}.available_stock`, stockInfo?.stock_quantity ?? 0);
        updateItemCalculations(index);
    }


    const onSubmit = (data: OrderFormValues) => {
        startTransition(async () => {
            for (const item of data.items) {
                const stockInfo = distributorStock.find(s => s.sku_id === item.sku_id);
                if (!stockInfo || !stockInfo.skus) continue;
                const stockNeeded = item.order_unit_type === 'cases'
                    ? item.quantity * (stockInfo.units_per_case || 1)
                    : item.quantity;

                if (stockNeeded > item.available_stock) {
                    toast({ variant: 'destructive', title: 'Insufficient Stock', description: `Not enough stock for ${stockInfo.skus.name}. Available: ${item.available_stock}, Needed: ${stockNeeded}` });
                    return;
                }
            }

            const orderData = {
                outlet_id: outlet.id,
                total_amount: totals.finalTotal,
                total_discount: totals.totalDiscount,
                payment_status: data.payment_status,
                amount_paid: data.payment_status === 'Paid' ? totals.finalTotal : (data.amount_paid || 0),
                items: data.items.map(item => {
                     const { total_price, unit_price, scheme_discount_percentage } = calculateItemTotals(item);
                    return {
                        sku_id: item.sku_id,
                        quantity: item.quantity,
                        unit_price,
                        total_price,
                        order_unit_type: item.order_unit_type,
                        scheme_discount_percentage,
                    }
                }),
            };

            if (distributorStock.length === 0 || !distributorStock[0].distributor_id) {
                 toast({ variant: "destructive", title: "Cannot create order", description: "Distributor information is missing." });
                 return;
            }

            const result = await createNewOrder(orderData, distributorStock[0].distributor_id);
            if (result.success) {
                toast({ title: "Order Placed!", description: `Order #${result.orderId} for ${outlet.name} has been placed.` });
                onOrderPlaced();
                setOpen(false);
            } else {
                toast({ variant: "destructive", title: "Failed to create order", description: result.error });
            }
        });
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={disabled}>Order</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                            <DialogTitle>New Order for: {outlet.name}</DialogTitle>
                            <DialogDescription>Add products, select order type, and set payment details.</DialogDescription>
                        </DialogHeader>

                        {loading ? (
                            <div className="flex flex-grow items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-grow items-center justify-center text-center text-destructive bg-destructive/10 rounded-md p-4 m-6">
                                <div>
                                    <p className="font-bold">Could not load order form</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0">
                                <ScrollArea className="h-full">
                                    <div className="p-6 space-y-4">
                                        {/* Mobile Cards */}
                                        <div className="grid gap-4 md:hidden">
                                            {fields.map((field, index) => {
                                                const stockInfo = distributorStock.find(s => s.sku_id === watchedItems[index]?.sku_id);
                                                const isCases = watchedItems[index]?.order_unit_type === 'cases';
                                                const { total_price, scheme_discount_percentage } = calculateItemTotals(watchedItems[index]);
                                                const final_total_price = total_price * (1 - (scheme_discount_percentage / 100));
                                                return (
                                                    <Card key={field.id}>
                                                        <CardHeader>
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-grow">
                                                                    <Select onValueChange={(value) => handleSkuChange(index, value)} defaultValue={String(watchedItems[index]?.sku_id || "0")}>
                                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger></FormControl>
                                                                        <SelectContent>{distributorStock.map(s => <SelectItem key={s.id} value={String(s.sku_id)}>{s.skus.name} {s.skus.unit_type ? `(${s.skus.unit_type})` : ''}</SelectItem>)}</SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <Button variant="ghost" size="icon" className="ml-2 flex-shrink-0" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label>Type</Label>
                                                                <Select onValueChange={(value) => handleFieldChange(index, 'order_unit_type', value)} defaultValue={watchedItems[index]?.order_unit_type}>
                                                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                                    <SelectContent><SelectItem value="units">Units</SelectItem><SelectItem value="cases">Cases</SelectItem></SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label>Quantity</Label>
                                                                <Input type="number" min={1} value={watchedItems[index]?.quantity} onChange={(e) => handleFieldChange(index, 'quantity', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                            <div className="text-sm">
                                                                <Label>Available</Label>
                                                                <div>{stockInfo?.stock_quantity ?? 'N/A'}</div>
                                                            </div>
                                                            <div className="text-sm">
                                                                <Label>Price</Label>
                                                                <div>₹{watchedItems[index]?.unit_price.toFixed(2)}</div>
                                                            </div>
                                                            {isCases && (
                                                                <div className="col-span-2 flex items-center justify-between">
                                                                    <Label htmlFor={`scheme-mobile-${index}`}>Apply Scheme ({scheme_discount_percentage}%)</Label>
                                                                    <Switch id={`scheme-mobile-${index}`} checked={watchedItems[index]?.apply_scheme} onCheckedChange={(checked) => handleFieldChange(index, 'apply_scheme', checked)} />
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                        <CardFooter className="bg-muted/50 p-3 flex justify-between items-center">
                                                            <span className="text-sm text-muted-foreground">Item Total</span>
                                                            <span className="font-bold text-lg">₹{final_total_price.toFixed(2)}</span>
                                                        </CardFooter>
                                                    </Card>
                                                )
                                            })}
                                        </div>

                                        {/* Desktop Table */}
                                        <div className="hidden md:block">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[25%]">SKU</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Qty</TableHead>
                                                        <TableHead>Available</TableHead>
                                                        <TableHead>Price</TableHead>
                                                        <TableHead>Total</TableHead>
                                                        <TableHead>Scheme</TableHead>
                                                        <TableHead>Final Total</TableHead>
                                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {fields.map((field, index) => {
                                                        const stockInfo = distributorStock.find(s => s.sku_id === watchedItems[index]?.sku_id);
                                                        const isCases = watchedItems[index]?.order_unit_type === 'cases';
                                                        const { total_price, scheme_discount_percentage } = calculateItemTotals(watchedItems[index]);
                                                        const final_total_price = total_price * (1 - (scheme_discount_percentage / 100));

                                                        return (
                                                            <TableRow key={field.id}>
                                                                <TableCell>
                                                                    <Select onValueChange={(value) => handleSkuChange(index, value)} defaultValue={String(watchedItems[index]?.sku_id || "0")}>
                                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger></FormControl>
                                                                        <SelectContent>{distributorStock.map(s => <SelectItem key={s.id} value={String(s.sku_id)}>{s.skus.name} {s.skus.unit_type ? `(${s.skus.unit_type})` : ''}</SelectItem>)}</SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Select onValueChange={(value) => handleFieldChange(index, 'order_unit_type', value)} defaultValue={watchedItems[index]?.order_unit_type}>
                                                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                                        <SelectContent><SelectItem value="units">Units</SelectItem><SelectItem value="cases">Cases</SelectItem></SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell><Input type="number" min={1} value={watchedItems[index]?.quantity} onChange={(e) => handleFieldChange(index, 'quantity', parseInt(e.target.value) || 1)} /></TableCell>
                                                                <TableCell>{stockInfo?.stock_quantity ?? 'N/A'}</TableCell>
                                                                <TableCell>₹{watchedItems[index]?.unit_price.toFixed(2)}</TableCell>
                                                                <TableCell>₹{total_price.toFixed(2)}</TableCell>
                                                                <TableCell>
                                                                    {isCases ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <Switch id={`scheme-${index}`} checked={watchedItems[index]?.apply_scheme} onCheckedChange={(checked) => handleFieldChange(index, 'apply_scheme', checked)} />
                                                                            <Label htmlFor={`scheme-${index}`}>{scheme_discount_percentage}%</Label>
                                                                        </div>
                                                                    ) : 'N/A'}
                                                                </TableCell>
                                                                <TableCell className="font-bold">₹{final_total_price.toFixed(2)}</TableCell>
                                                                <TableCell><Button variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ sku_id: 0, order_unit_type: 'units', quantity: 1, unit_price: 0, total_price: 0, scheme_discount_percentage: 0, apply_scheme: true, available_stock: 0 })}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                                        </Button>
                                        <FormMessage>{form.formState.errors.items?.root?.message || form.formState.errors.items?.message}</FormMessage>
                                        
                                        <Separator className="my-4" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="payment_status"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel>Payment Status</FormLabel>
                                                        <FormControl>
                                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Unpaid" /></FormControl><FormLabel className="font-normal">Unpaid</FormLabel></FormItem>
                                                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Paid" /></FormControl><FormLabel className="font-normal">Fully Paid (₹{totals.finalTotal.toFixed(2)})</FormLabel></FormItem>
                                                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Partially Paid" /></FormControl><FormLabel className="font-normal">Partially Paid</FormLabel></FormItem>
                                                            </RadioGroup>
                                                        </FormControl><FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            {watchedPaymentStatus === 'Partially Paid' && (
                                                <FormField control={form.control} name="amount_paid" render={({ field }) => (<FormItem><FormLabel>Amount Paid</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            )}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div className="flex items-baseline gap-4">
                                {totals.totalDiscount > 0 && <div className="text-sm">Subtotal: <span className="line-through">₹{totals.subtotal.toFixed(2)}</span></div>}
                                {totals.totalDiscount > 0 && <div className="text-sm">Discount: <span className="text-green-600">-₹{totals.totalDiscount.toFixed(2)}</span></div>}
                            </div>
                             <div className="flex items-center justify-end gap-4">
                                <div className="text-right">
                                    <p className="text-muted-foreground">Total Order Value</p>
                                    <p className="text-2xl font-bold">₹{totals.finalTotal.toFixed(2)}</p>
                                </div>
                                <Button type="submit" size="lg" disabled={isSubmitting || loading || !!error || fields.length === 0}>
                                    {isSubmitting ? "Placing Order..." : "Place Order"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

    