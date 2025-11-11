
"use client";

import { useState } from "react";
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
import { PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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

type AddSkuDialogProps = {
  onSkuAdded: () => void;
};

export function AddSkuDialog({ onSkuAdded }: AddSkuDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<SkuFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            stock_quantity: 0,
        },
    });

    const onSubmit: SubmitHandler<SkuFormValues> = async (data) => {
        // For master SKUs, distributorId is null
        const { error } = await supabase.from("skus").insert({
            ...data,
            distributor_id: null,
        });

        if (error) {
            toast({
                variant: "destructive",
                title: "Error Creating SKU",
                description: error.message,
            });
        } else {
             toast({
                title: "SKU Created",
                description: `${data.name} has been added to the master product list.`,
            });
            onSkuAdded();
            setOpen(false);
            form.reset();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Add Master SKU
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add New Master SKU</DialogTitle>
                    <DialogDescription>
                        Fill in the details for a new product in your main catalog.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
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
                                        <FormLabel>Opening Stock</FormLabel>
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
                                        <FormLabel>Case Price (to Distributor) (₹)</FormLabel>
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
                                    <FormItem>
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
                                {form.formState.isSubmitting ? "Saving..." : "Save SKU"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
