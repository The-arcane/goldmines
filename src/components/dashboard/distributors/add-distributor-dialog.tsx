
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
import { createDistributorWithAdmin } from "@/lib/actions";
import { Separator } from "@/components/ui/separator";
import type { User } from "@/lib/types";

const formSchema = z.object({
  distributorName: z.string().min(3, "Organization name must be at least 3 characters."),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  adminName: z.string().min(2, "Admin name must be at least 2 characters."),
  adminEmail: z.string().email("Invalid email address for admin."),
  adminPassword: z.string().min(6, "Admin password must be at least 6 characters."),
});

type AddDistributorDialogProps = {
  onDistributorAdded: () => void;
  users: User[];
};

export function AddDistributorDialog({ onDistributorAdded, users }: AddDistributorDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            distributorName: "",
            address: "",
            gst_number: "",
            adminName: "",
            adminEmail: "",
            adminPassword: "",
        },
    });

    const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (data) => {
        const result = await createDistributorWithAdmin(data);

        if (result.success) {
            toast({
                title: "Distributor Created",
                description: `${data.distributorName} and its admin have been created.`,
            });
            onDistributorAdded();
            setOpen(false);
            form.reset();
        } else {
            toast({
                variant: "destructive",
                title: "Error Creating Distributor",
                description: result.error || "An unknown error occurred.",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Add Distributor
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Distributor</DialogTitle>
                    <DialogDescription>
                        Create a new distributor organization and its primary admin user.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <div className="space-y-2">
                             <h4 className="font-medium text-sm">Organization Details</h4>
                             <FormField
                                control={form.control}
                                name="distributorName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Organization Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., City-Wide Beverages" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 123 Business Rd, Commerce City" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gst_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GST Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 22AAAAA0000A1Z5" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                       
                        <Separator />

                        <div className="space-y-2">
                             <h4 className="font-medium text-sm">Admin User Account</h4>
                            <FormField
                                control={form.control}
                                name="adminName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admin's Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="adminEmail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admin's Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="admin@distributor.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="adminPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Temporary Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Creating..." : "Create Distributor"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
