
"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { CreateOrderDialogContent } from "./create-order-dialog-content";
import { CreateOrderDrawer } from "./create-order-drawer";
import type { Outlet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

type CreateOrderWrapperProps = {
    outlet: Outlet;
    onOrderPlaced: () => void;
    disabled?: boolean;
}

export function CreateOrderDialog({ outlet, onOrderPlaced, disabled }: CreateOrderWrapperProps) {
    const [open, setOpen] = useState(false);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button disabled={disabled}>Order</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl max-h-[90vh]">
                     <CreateOrderDialogContent outlet={outlet} onOrderPlaced={onOrderPlaced} setOpen={setOpen} />
                </DialogContent>
            </Dialog>
        );
    }

    return <CreateOrderDrawer outlet={outlet} onOrderPlaced={onOrderPlaced} disabled={disabled} />;
}
