
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Outlet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddOutletDialog } from "@/components/dashboard/outlets/add-outlet-dialog";
import { OutletsMap } from "@/components/dashboard/outlets/outlets-map";
import { useToast } from "@/hooks/use-toast";
import { EditOutletDialog } from "@/components/dashboard/outlets/edit-outlet-dialog";
import { DeleteOutletAlert } from "@/components/dashboard/outlets/delete-outlet-alert";

export default function OutletsPage() {
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchOutlets = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("outlets").select("*").order("name", { ascending: true });

        if (error) {
            toast({
                variant: "destructive",
                title: "Error fetching outlets",
                description: error.message,
            });
            setOutlets([]);
        } else {
            setOutlets(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOutlets();
    }, []);

    const handleDataChange = () => {
        fetchOutlets();
    };

    return (
        <div className="flex min-h-screen w-full flex-col">
            <main className="flex flex-1 flex-col gap-4 md:gap-8">
                <div className="flex items-center">
                    <h1 className="font-headline text-lg font-semibold md:text-2xl">Outlets</h1>
                    <div className="ml-auto flex items-center gap-2">
                        <AddOutletDialog onOutletAdded={handleDataChange} />
                    </div>
                </div>

                <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                     <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>All Outlets</CardTitle>
                            <CardDescription>
                                A list of all registered outlets and their credit status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OutletsTable outlets={outlets} loading={loading} onDataChange={handleDataChange} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Outlets Map</CardTitle>
                             <CardDescription>
                                Geographical distribution of all outlets and their geofences.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <OutletsMap outlets={outlets} />
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

type OutletsTableProps = {
    outlets: Outlet[];
    loading: boolean;
    onDataChange: () => void;
};

function OutletsTable({ outlets, loading, onDataChange }: OutletsTableProps) {
    if (loading) {
        return <div className="text-center p-4">Loading outlets...</div>;
    }

    if (outlets.length === 0) {
        return <div className="text-center text-muted-foreground p-4">No outlets found. Add one to get started.</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Current Due</TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {outlets.map((outlet) => (
                    <TableRow key={outlet.id}>
                        <TableCell className="font-medium">{outlet.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline">{outlet.type}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono">₹{outlet.credit_limit?.toFixed(2)}</TableCell>
                         <TableCell className="text-right font-mono">₹{outlet.current_due?.toFixed(2)}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                     <EditOutletDialog outlet={outlet} onOutletUpdated={onDataChange}>
                                        <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left">
                                            Edit
                                        </button>
                                    </EditOutletDialog>
                                    <DeleteOutletAlert outlet={outlet} onOutletDeleted={onDataChange}>
                                        <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left text-destructive">
                                            Delete
                                        </button>
                                    </DeleteOutletAlert>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
