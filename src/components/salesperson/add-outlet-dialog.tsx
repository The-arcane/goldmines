
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
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
import { PlaceAutocomplete } from "@/components/map/autocomplete";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

type AddSalespersonOutletDialogProps = {
  onOutletAdded: () => void;
};

export function AddSalespersonOutletDialog({ onOutletAdded }: AddSalespersonOutletDialogProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [outletName, setOutletName] = useState("");
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const { toast } = useToast();

    const handlePlaceSelect = (place: google.maps.places.PlaceResult | null) => {
        setSelectedPlace(place);
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (!outletName || !selectedPlace) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please provide a name and select an address.",
            });
            return;
        }

        if (!selectedPlace.geometry?.location) {
             toast({ variant: "destructive", title: "Invalid Address" });
            return;
        }

        setLoading(true);

        const lat = selectedPlace.geometry.location.lat();
        const lng = selectedPlace.geometry.location.lng();
        const address = selectedPlace.formatted_address || "";

        const { data: outletData, error: outletError } = await supabase
            .from("outlets")
            .insert({ 
                name: outletName, 
                type: "Retail", // Salespeople add retail outlets by default
                address, 
                lat, 
                lng, 
                created_by: user.id
            })
            .select()
            .single();

        if (outletError) {
            toast({ variant: "destructive", title: "Error creating outlet", description: outletError.message });
            setLoading(false);
            return;
        }

        const { error: geofenceError } = await supabase.from("geofences").insert({
            outlet_id: outletData.id,
            lat,
            lng,
            radius: 150,
        });

        if (geofenceError) {
            await supabase.from("outlets").delete().eq("id", outletData.id);
            toast({ variant: "destructive", title: "Error creating geofence", description: geofenceError.message });
            setLoading(false);
            return;
        }
        
        toast({ title: "Outlet Added!", description: `${outletName} is now on your route.` });
        setLoading(false);
        setOpen(false);
        setOutletName("");
        setSelectedPlace(null);
        onOutletAdded();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Outlet
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Outlet</DialogTitle>
                    <DialogDescription>
                        Add a new retail outlet to your personal route.
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


    