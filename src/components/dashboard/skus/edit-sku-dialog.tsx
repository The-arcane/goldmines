
"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { updateMasterSku } from "@/lib/actions";
import type { Sku } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters."),
  product_code: z.string().optional(),
  unit_type: z.string().optional(),
  units_per_case: z.coerce.number().int().positive().optional(),
  case_price: z.coerce.number().positive().optional(),
  mrp: z.coerce.number().positive().optional(),
  ptr: z.coerce.number().positive().optional(),
  stock_quantity: z.coerce.number().int().min(0, "Stock can't be negative."),
});

type SkuFormValues = z.infer<typeof formSchema>;

type EditSkuDialogProps = {
  sku: Sku;
  onSkuUpdated: () => void;
  children: React.ReactNode;
};

export function EditSkuDialog({ sku, onSkuUpdated, children }: EditSkuDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<SkuFormValues>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: sku.name,
                product_code: sku.product_code || "",
                unit_type: sku.unit_type || "",
                units_per_case: sku.units_per_case || undefined,
                case_price: sku.case_price || undefined,
                mrp: sku.mrp || undefined,
                ptr: sku.ptr || undefined,
                stock_quantity: sku.stock_quantity || 0,
            });
        }
    }, [open, sku, form]);


    const onSubmit: SubmitHandler<SkuFormValues> = async (data) => {
        const result = await updateMasterSku(sku.id, data);

        if (result.success) {
            toast({
                title: "SKU Updated",
                description: `${data.name} has been updated.`,
            });
            onSkuUpdated();
            setOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Error Updating SKU",
                description: result.error || "An unknown error occurred.",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Master SKU</DialogTitle>
                    <DialogDescription>
                       Update the details for {sku.name}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Product Name</FormLabel>
                                        <FormControl><Input placeholder="e.g., Cool Cola 500ml" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="product_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SKU Code</FormLabel>
                                        <FormControl><Input placeholder="CC500" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="stock_quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Stock</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="unit_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit Type</FormLabel>
                                        <FormControl><Input placeholder="e.g., bottles, packets" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="units_per_case"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Units / Case</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="case_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Case Price (₹)</FormLabel>
                                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="mrp"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>MRP (₹)</FormLabel>
                                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="ptr"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Price to Retailer (PTR) (₹)</FormLabel>
                                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
