"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
import { PlusCircle } from "lucide-react";

type AddOutletDialogProps = {
  onOutletAdded: () => void;
};

export function AddOutletDialog({ onOutletAdded }: AddOutletDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [outletName, setOutletName] = useState("");
    const [outletType, setOutletType] = useState("Retail");
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const { toast } = useToast();

    const handlePlaceSelect = (place: google.maps.places.PlaceResult | null) => {
        setSelectedPlace(place);
    };

    const handleSubmit = async () => {
        if (!outletName || !outletType || !selectedPlace) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill out all fields and select an address.",
            });
            return;
        }

        if (!selectedPlace.geometry || !selectedPlace.geometry.location) {
             toast({
                variant: "destructive",
                title: "Invalid Address",
                description: "Could not get location data for the selected address.",
            });
            return;
        }

        setLoading(true);

        const lat = selectedPlace.geometry.location.lat();
        const lng = selectedPlace.geometry.location.lng();
        const address = selectedPlace.formatted_address || "";

        // 1. Insert into outlets table
        const { data: outletData, error: outletError } = await supabase
            .from("outlets")
            .insert({ name: outletName, type: outletType, address, lat, lng })
            .select()
            .single();

        if (outletError) {
            toast({
                variant: "destructive",
                title: "Error creating outlet",
                description: outletError.message,
            });
            setLoading(false);
            return;
        }

        // 2. Insert into geofences table
        const { error: geofenceError } = await supabase.from("geofences").insert({
            outlet_id: outletData.id,
            lat,
            lng,
            radius: 150, // Max 150m as per spec
        });

        if (geofenceError) {
            // If geofence fails, we should ideally roll back the outlet creation.
            // For simplicity, we'll just show an error. A real app might use a transaction.
            await supabase.from("outlets").delete().eq("id", outletData.id);
            toast({
                variant: "destructive",
                title: "Error creating geofence",
                description: `Outlet creation rolled back. ${geofenceError.message}`,
            });
            setLoading(false);
            return;
        }
        
        toast({
            title: "Outlet Created!",
            description: `${outletName} has been added successfully.`,
        });

        // Reset form and close dialog
        setLoading(false);
        setOpen(false);
        setOutletName("");
        setOutletType("Retail");
        setSelectedPlace(null);
        onOutletAdded(); // Callback to refresh the outlets list
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Add Outlet
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Outlet</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the new outlet. The address will be used to create a geofence.
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
                         <Select onValueChange={setOutletType} defaultValue={outletType}>
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
                                placeholder="Start typing address..."
                                onPlaceSelect={handlePlaceSelect}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Outlet"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
