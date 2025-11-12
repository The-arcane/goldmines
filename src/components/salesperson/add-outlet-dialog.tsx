
"use client";

import { useState, useCallback } from "react";
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
import { PlusCircle, MapPin } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type AddSalespersonOutletDialogProps = {
  onOutletAdded: () => void;
  disabled?: boolean;
};

export function AddSalespersonOutletDialog({ onOutletAdded, disabled }: AddSalespersonOutletDialogProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [outletName, setOutletName] = useState("");
    const [outletType, setOutletType] = useState("Retail");
    const [ownerName, setOwnerName] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [address, setAddress] = useState("");
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const { coords } = useGeolocation();
    const { toast } = useToast();

    const handlePlaceSelect = (place: google.maps.places.PlaceResult | null) => {
        setSelectedPlace(place);
        if (place) {
            setAddress(place.formatted_address || "");
            setOutletName(place.name || "");
        }
    };

    const handleUseCurrentLocation = useCallback(() => {
        if (coords) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat: coords.latitude, lng: coords.longitude } }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    setAddress(results[0].formatted_address);
                    // Mock a place object for submission
                    setSelectedPlace({
                        formatted_address: results[0].formatted_address,
                        geometry: {
                            location: new window.google.maps.LatLng(coords.latitude, coords.longitude)
                        }
                    } as google.maps.places.PlaceResult);
                } else {
                    toast({ variant: 'destructive', title: 'Could not find address', description: 'Unable to reverse geocode your current location.' });
                }
            });
        } else {
            toast({ variant: 'destructive', title: 'Location not available', description: 'Please enable location services.' });
        }
    }, [coords, toast]);

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

        const { data: distributorLink, error: distributorLinkError } = await supabase
            .from('distributor_users')
            .select('distributor_id')
            .eq('user_id', user.id)
            .single();

        if (distributorLinkError || !distributorLink) {
            toast({ variant: "destructive", title: "Cannot Add Outlet", description: "You are not assigned to a distributor." });
            setLoading(false);
            return;
        }

        const distributorId = distributorLink.distributor_id;
        const lat = selectedPlace.geometry.location.lat();
        const lng = selectedPlace.geometry.location.lng();
        const finalAddress = selectedPlace.formatted_address || address;

        const { data: outletData, error: outletError } = await supabase
            .from("outlets")
            .insert({ 
                name: outletName, 
                type: outletType, 
                address: finalAddress, 
                lat, 
                lng, 
                created_by: user.id,
                distributor_id: distributorId,
                // These are not in the schema yet, but good practice to have them
                // owner_name: ownerName,
                // contact_number: contactNumber,
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
        setOutletType("Retail");
        setOwnerName("");
        setContactNumber("");
        setAddress("");
        setSelectedPlace(null);
        onOutletAdded();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={disabled}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Outlet
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add New Outlet</DialogTitle>
                    <DialogDescription>
                        Add a new retail outlet to your personal route.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <div className="flex gap-2">
                            <PlaceAutocomplete
                                id="address"
                                placeholder="Start typing address or place name..."
                                onPlaceSelect={handlePlaceSelect}
                                defaultValue={address}
                            />
                            <Button type="button" variant="outline" size="icon" onClick={handleUseCurrentLocation} aria-label="Use Current Location">
                                <MapPin className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Outlet Name</Label>
                            <Input
                                id="name"
                                value={outletName}
                                onChange={(e) => setOutletName(e.target.value)}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="type">Outlet Type</Label>
                            <Select onValueChange={setOutletType} defaultValue={outletType}>
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Select an outlet type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Retail">Retail</SelectItem>
                                    <SelectItem value="Distributor">Distributor</SelectItem>
                                    <SelectItem value="Warehouse">Warehouse</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="owner-name">Owner Name</Label>
                            <Input
                                id="owner-name"
                                value={ownerName}
                                onChange={(e) => setOwnerName(e.target.value)}
                                placeholder="e.g., Mr. Sharma"
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="contact-number">Contact Number</Label>
                            <Input
                                id="contact-number"
                                type="tel"
                                value={contactNumber}
                                onChange={(e) => setContactNumber(e.target.value)}
                                placeholder="e.g., 9876543210"
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

    