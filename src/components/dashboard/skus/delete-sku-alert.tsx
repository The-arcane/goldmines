
"use client";

import { useState } from "react";
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
import { deleteMasterSku } from "@/lib/actions";
import type { Sku } from "@/lib/types";

type DeleteSkuAlertProps = {
    sku: Sku;
    onSkuDeleted: () => void;
    children: React.ReactNode;
};

export function DeleteSkuAlert({ sku, onSkuDeleted, children }: DeleteSkuAlertProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteMasterSku(sku.id);

        if (result.success) {
            toast({
                title: "SKU Deleted",
                description: `${sku.name} has been permanently removed.`,
            });
            onSkuDeleted();
        } else {
             toast({
                variant: "destructive",
                title: "Error deleting SKU",
                description: result.error,
            });
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
                        This action cannot be undone. This will permanently delete the SKU
                        <span className="font-bold"> {sku.name} </span>
                        from your master product list.
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
