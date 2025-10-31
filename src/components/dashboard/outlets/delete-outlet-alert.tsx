
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Outlet } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DeleteOutletAlertProps = {
    outlet: Outlet;
    onOutletDeleted: () => void;
    children: React.ReactNode;
};

export function DeleteOutletAlert({ outlet, onOutletDeleted, children }: DeleteOutletAlertProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        setLoading(true);
        // Cascade delete should handle geofence automatically if set up in DB schema
        const { error } = await supabase.from("outlets").delete().eq("id", outlet.id);

        if (error) {
            toast({
                variant: "destructive",
                title: "Error deleting outlet",
                description: error.message,
            });
        } else {
            toast({
                title: "Outlet Deleted",
                description: `${outlet.name} has been permanently removed.`,
            });
            onOutletDeleted();
        }

        setLoading(false);
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the outlet
                        <span className="font-bold"> {outlet.name} </span>
                        and its associated geofence from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive hover:bg-destructive/90">
                        {loading ? "Deleting..." : "Yes, delete it"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
