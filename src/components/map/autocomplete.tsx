"use client";

import { useRef, useEffect, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";

type PlaceAutocompleteProps = {
    onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void;
    className?: string;
    placeholder?: string;
    id?: string;
};

export const PlaceAutocomplete = ({ onPlaceSelect, ...rest }: PlaceAutocompleteProps) => {
    const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const places = useMapsLibrary("places");

    useEffect(() => {
        if (!places || !inputRef.current) return;

        const autocomplete = new places.Autocomplete(inputRef.current, {
            fields: ["geometry", "name", "formatted_address"],
        });

        setPlaceAutocomplete(autocomplete);

        return () => {
            if (autocomplete) {
                google.maps.event.clearInstanceListeners(autocomplete);
            }
        };
    }, [places]);

    useEffect(() => {
        if (!placeAutocomplete) return;

        const listener = placeAutocomplete.addListener("place_changed", () => {
            onPlaceSelect(placeAutocomplete.getPlace());
        });

        return () => {
            if (listener) {
                listener.remove();
            }
        };

    }, [placeAutocomplete, onPlaceSelect]);

    return (
        <div className="autocomplete-container">
            <Input ref={inputRef} {...rest} />
        </div>
    );
};
