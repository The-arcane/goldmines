
"use client";

import { useRef, useEffect, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";

type PlaceAutocompleteProps = {
    onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void;
    className?: string;
    placeholder?: string;
    id?: string;
    defaultValue?: string;
};

export const PlaceAutocomplete = ({ onPlaceSelect, defaultValue, ...rest }: PlaceAutocompleteProps) => {
    const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const places = useMapsLibrary("places");

    useEffect(() => {
        if (!places || !inputRef.current) return;

        const autocomplete = new places.Autocomplete(inputRef.current, {
            fields: ["geometry", "name", "formatted_address"],
        });
        
        setPlaceAutocomplete(autocomplete);

    }, [places]);

    useEffect(() => {
        if (placeAutocomplete) {
            const listener = placeAutocomplete.addListener("place_changed", () => {
                onPlaceSelect(placeAutocomplete.getPlace());
            });
             return () => {
                listener.remove();
            };
        }
    }, [placeAutocomplete, onPlaceSelect]);
    
    // Set default value if provided
    useEffect(() => {
        if (inputRef.current && defaultValue) {
            inputRef.current.value = defaultValue;
        }
    }, [defaultValue]);

    return (
        <div className="autocomplete-container">
            <Input ref={inputRef} {...rest} />
        </div>
    );
};
