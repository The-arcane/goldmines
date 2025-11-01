
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import { createNewUser } from "@/lib/actions";
import type { UserRole, Distributor } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(['admin', 'sales_executive', 'distributor_admin', 'delivery_partner']),
  distributorId: z.string().optional(),
});

type AddUserDialogProps = {
  onUserAdded: () => void;
  allowedRoles: { value: UserRole, label: string }[];
  defaultRole: UserRole;
  distributors?: Distributor[]; // For admin view, to assign a delivery partner
  distributorId?: string; // For distributor view, their own org ID
};

export function AddUserDialog({ onUserAdded, allowedRoles, defaultRole, distributors, distributorId }: AddUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: defaultRole,
        },
    });

    const watchedRole = form.watch("role");

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (!open) {
            form.reset({
                name: "",
                email: "",
                password: "",
                role: defaultRole,
                distributorId: undefined,
            });
        }
    }, [open, form, defaultRole]);

    const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (data) => {
        setLoading(true);
        
        // If the distributor admin is creating a user, the distributorId is passed as a prop.
        // If the site admin is creating a delivery partner, it's selected from the form.
        const finalDistributorId = distributorId || data.distributorId;
       
        const result = await createNewUser(data, finalDistributorId);

        if (result.success) {
            toast({
                title: "User Created",
                description: `${data.name} has been added to the system.`,
            });
            onUserAdded();
            setOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Error Creating User",
                description: result.error || "An unknown error occurred.",
            });
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Add User
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                        Create a new user and assign them a role. Their account will be active immediately.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="user@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {allowedRoles.map(role => (
                                                <SelectItem key={role.value} value={role.value}>
                                                    {role.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Conditional field for ADMIN to select distributor */}
                        {distributors && (watchedRole === 'delivery_partner' || watchedRole === 'distributor_admin') && (
                            <FormField
                                control={form.control}
                                name="distributorId"
                                rules={{ required: 'Please select a distributor for this user.' }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assign to Distributor</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a distributor" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {distributors.map(distributor => (
                                                    <SelectItem key={distributor.id} value={String(distributor.id)}>
                                                        {distributor.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Creating User..." : "Create User"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
