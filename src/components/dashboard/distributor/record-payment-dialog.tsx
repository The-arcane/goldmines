
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { recordOrderPayment } from "@/lib/actions";
import type { Order } from "@/lib/types";

const formSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be positive."),
});

type RecordPaymentDialogProps = {
  order: Order;
  onPaymentRecorded: () => void;
};

export function RecordPaymentDialog({ order, onPaymentRecorded }: RecordPaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const balanceDue = order.total_amount - (order.amount_paid || 0);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: balanceDue > 0 ? balanceDue : 0,
        },
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (data.amount > balanceDue) {
            form.setError("amount", {
                type: "manual",
                message: `Payment cannot exceed the balance due of ₹${balanceDue.toFixed(2)}.`
            });
            return;
        }

        const result = await recordOrderPayment(order.id, data.amount);

        if (result.success) {
            toast({
                title: "Payment Recorded",
                description: `₹${data.amount.toFixed(2)} has been recorded for order #${order.id}.`,
            });
            onPaymentRecorded();
            setOpen(false);
            form.reset();
        } else {
            toast({
                variant: "destructive",
                title: "Error Recording Payment",
                description: result.error || "An unknown error occurred.",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={balanceDue <= 0}>
                    Record Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record Payment for Order #{order.id}</DialogTitle>
                    <DialogDescription>
                        Enter the amount received for this order. The balance due is <span className="font-bold">₹{balanceDue.toFixed(2)}</span>.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                       <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Amount (₹)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Saving..." : "Save Payment"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

    