
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
import { updateDistributor } from "@/lib/actions";
import type { Distributor, User, UserRole } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(3, "Organization name must be at least 3 characters."),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  admin_user_id: z.coerce.number().optional(),
});

type EditDistributorFormValues = z.infer<typeof formSchema>;

type EditDistributorDialogProps = {
  distributor: Distributor;
  onDistributorUpdated: () => void;
  users: User[];
  children: React.ReactNode;
};

export function EditDistributorDialog({ distributor, onDistributorUpdated, users, children }: EditDistributorDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<EditDistributorFormValues>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: distributor.name,
                address: distributor.address || "",
                gst_number: distributor.gst_number || "",
                admin_user_id: distributor.admin_user_id || undefined,
            });
        }
    }, [open, distributor, form]);
    
    // Filter users who can be assigned as distributor admins
    const potentialAdmins = users.filter(u => u.role === 'distributor_admin' || u.id === distributor.admin_user_id);

    const onSubmit: SubmitHandler<EditDistributorFormValues> = async (data) => {
        const result = await updateDistributor(distributor.id, data);

        if (result.success) {
            toast({
                title: "Distributor Updated",
                description: `${data.name} has been updated successfully.`,
            });
            onDistributorUpdated();
            setOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Error Updating Distributor",
                description: result.error || "An unknown error occurred.",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Distributor</DialogTitle>
                    <DialogDescription>
                        Update the details for {distributor.name}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Organization Name</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
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
                                    <FormControl><Input {...field} /></FormControl>
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
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="admin_user_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Admin User</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an admin" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="0">Unassigned</SelectItem>
                                            {potentialAdmins.map(user => (
                                                <SelectItem key={user.id} value={String(user.id)}>
                                                    {user.name} ({user.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
