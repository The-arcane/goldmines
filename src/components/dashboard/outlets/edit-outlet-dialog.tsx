
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Outlet } from "@/lib/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaceAutocomplete } from "@/components/map/autocomplete";
import { useToast } from "@/hooks/use-toast";

type EditOutletDialogProps = {
  outlet: Outlet;
  onOutletUpdated: () => void;
  children: React.ReactNode;
};

export function EditOutletDialog({ outlet, onOutletUpdated, children }: EditOutletDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [outletName, setOutletName] = useState(outlet.name);
    const [outletType, setOutletType] = useState(outlet.type);
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const [address, setAddress] = useState(outlet.address);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            setOutletName(outlet.name);
            setOutletType(outlet.type);
            setAddress(outlet.address);
            setSelectedPlace(null);
        }
    }, [open, outlet]);

    const handlePlaceSelect = (place: google.maps.places.PlaceResult | null) => {
        setSelectedPlace(place);
        setAddress(place?.formatted_address || "");
    };

    const handleSubmit = async () => {
        if (!outletName || !outletType || !address) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill out all fields.",
            });
            return;
        }

        setLoading(true);

        let lat = outlet.lat;
        let lng = outlet.lng;
        let newAddress = outlet.address;

        // If a new place was selected from autocomplete, update lat/lng
        if (selectedPlace && selectedPlace.geometry?.location) {
            lat = selectedPlace.geometry.location.lat();
            lng = selectedPlace.geometry.location.lng();
            newAddress = selectedPlace.formatted_address || address;
        }

        // 1. Update the outlet in the database
        const { error: outletError } = await supabase
            .from("outlets")
            .update({ name: outletName, type: outletType, address: newAddress, lat, lng })
            .eq("id", outlet.id);

        if (outletError) {
            toast({
                variant: "destructive",
                title: "Error updating outlet",
                description: outletError.message,
            });
            setLoading(false);
            return;
        }

        // 2. If location changed, update the geofence
        if (lat !== outlet.lat || lng !== outlet.lng) {
            const { error: geofenceError } = await supabase
                .from("geofences")
                .update({ lat, lng })
                .eq("outlet_id", outlet.id);

            if (geofenceError) {
                toast({
                    variant: "destructive",
                    title: "Error updating geofence",
                    description: `The outlet was updated, but the geofence location could not be. ${geofenceError.message}`,
                });
            }
        }
        
        toast({
            title: "Outlet Updated!",
            description: `${outletName} has been updated successfully.`,
        });

        setLoading(false);
        setOpen(false);
        onOutletUpdated();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Outlet</DialogTitle>
                    <DialogDescription>
                        Update the details for {outlet.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={outletName}
                            onChange={(e) => setOutletName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                         <Select onValueChange={setOutletType} value={outletType}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select an outlet type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Retail">Retail</SelectItem>
                                <SelectItem value="Distributor">Distributor</SelectItem>
                                <SelectItem value="Warehouse">Warehouse</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">
                            Address
                        </Label>
                        <div className="col-span-3">
                            <PlaceAutocomplete
                                id="address"
                                placeholder="Type to search a new address..."
                                onPlaceSelect={handlePlaceSelect}
                                defaultValue={address}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
