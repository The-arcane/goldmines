
"use client";

import { Map, AdvancedMarker, Pin, useApiIsLoaded, useMap } from "@vis.gl/react-google-maps";
import { Circle } from "@/components/map/circle";
import type { Outlet } from "@/lib/types";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { haversineDistance } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { differenceInMinutes } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LocateFixed, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus, Minus } from "lucide-react";

type SalespersonMapProps = {
    outlets: Outlet[];
    loading: boolean;
}

function MapControls() {
    const map = useMap();

    const onZoom = (level: number) => {
        if (!map) return;
        map.setZoom(map.getZoom()! + level);
    };

    const onPan = (x: number, y: number) => {
        if (!map) return;
        map.panBy(x, y);
    };
    
    const { coords, loading: geoLoading } = useGeolocation();

    const onRecenter = useCallback(() => {
        if (!map || !coords) return;
        map.panTo({ lat: coords.latitude, lng: coords.longitude });
        map.setZoom(15);
    }, [map, coords]);

    return (
        <div className="absolute top-2 right-2 flex flex-col gap-2">
            <Button size="icon" onClick={() => onZoom(1)} aria-label="Zoom In"><Plus className="h-4 w-4" /></Button>
            <Button size="icon" onClick={() => onZoom(-1)} aria-label="Zoom Out"><Minus className="h-4 w-4" /></Button>
            <Button size="icon" onClick={onRecenter} disabled={geoLoading} aria-label="Recenter"><LocateFixed className="h-4 w-4" /></Button>
            <div className="grid grid-cols-3 gap-1">
                 <div className="col-start-2"><Button size="icon" onClick={() => onPan(0, -50)} aria-label="Pan Up"><ArrowUp className="h-4 w-4" /></Button></div>
                 <div><Button size="icon" onClick={() => onPan(-50, 0)} aria-label="Pan Left"><ArrowLeft className="h-4 w-4" /></Button></div>
                 <div></div>
                 <div><Button size="icon" onClick={() => onPan(50, 0)} aria-label="Pan Right"><ArrowRight className="h-4 w-4" /></Button></div>
                 <div className="col-start-2"><Button size="icon" onClick={() => onPan(0, 50)} aria-label="Pan Down"><ArrowDown className="h-4 w-4" /></Button></div>
            </div>
        </div>
    )
}

export function SalespersonMap({ outlets, loading }: SalespersonMapProps) {
  const { user } = useAuth();
  const { coords } = useGeolocation({ enableHighAccuracy: true });
  const [center, setCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const { toast } = useToast();
  const isLoaded = useApiIsLoaded();
  
  const geofenceStatus = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (coords) {
      setCenter({ lat: coords.latitude, lng: coords.longitude });
    } else if (outlets.length > 0) {
      setCenter({ lat: outlets[0].lat, lng: outlets[0].lng });
    }
  }, [coords, outlets]);

  useEffect(() => {
    if (!coords || !user || outlets.length === 0) return;

    const checkGeofences = async () => {
      for (const outlet of outlets) {
        const distance = haversineDistance(coords, { lat: outlet.lat, lng: outlet.lng });
        const isInside = distance <= 150;
        const wasInside = geofenceStatus.current[outlet.id] || false;

        if (isInside && !wasInside) {
          geofenceStatus.current[outlet.id] = true;
          const { error } = await supabase.from("visits").insert({
            user_id: user.id,
            outlet_id: outlet.id,
            entry_time: new Date().toISOString(),
            within_radius: true,
          });

          if (error) {
            toast({ variant: "destructive", title: "Failed to log visit entry", description: error.message });
          } else {
            toast({ title: "Geofence Entered", description: `You have entered the zone for ${outlet.name}. Your visit has started.` });
          }

        } else if (!isInside && wasInside) {
          geofenceStatus.current[outlet.id] = false;

          const { data: visitData, error: visitError } = await supabase
            .from("visits")
            .select("id, entry_time")
            .eq("user_id", user.id)
            .eq("outlet_id", outlet.id)
            .is("exit_time", null)
            .order("entry_time", { ascending: false })
            .limit(1)
            .single();

          if (visitError || !visitData) {
            continue;
          }

          const exitTime = new Date();
          const entryTime = new Date(visitData.entry_time);
          const duration = differenceInMinutes(exitTime, entryTime);

          const { error: updateError } = await supabase
            .from("visits")
            .update({
              exit_time: exitTime.toISOString(),
              duration_minutes: duration,
            })
            .eq("id", visitData.id);
          
          if (updateError) {
             toast({ variant: "destructive", title: "Failed to log visit exit", description: updateError.message });
          } else {
             toast({ title: "Geofence Exited", description: `Visit to ${outlet.name} ended. Duration: ${duration} minutes.` });
          }
        }
      }
    };

    checkGeofences();

  }, [coords, user, outlets, toast]);
  
  if (loading || !isLoaded) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />
  }

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border relative">
      <Map
        mapId="salesperson-live-map"
        center={center}
        zoom={14}
        gestureHandling={"greedy"}
        disableDefaultUI={true}
      >
        {outlets.map((outlet) => (
          <AdvancedMarker key={outlet.id} position={{ lat: outlet.lat, lng: outlet.lng }}>
            <Pin background={"#2E3192"} borderColor={"#2E3192"} glyphColor={"#fff"} />
          </AdvancedMarker>
        ))}
         {outlets.map((outlet) => (
          <Circle
            key={`circle-${outlet.id}`}
            center={{ lat: outlet.lat, lng: outlet.lng }}
            radius={150} // 150m radius
            strokeColor="#2E3192"
            strokeOpacity={0.4}
            strokeWeight={1}
            fillColor="#2E3192"
            fillOpacity={0.1}
          />
        ))}

        {coords && (
          <AdvancedMarker position={{ lat: coords.latitude, lng: coords.longitude }}>
            <div className="relative">
                <div className="absolute h-6 w-6 rounded-full bg-green-400 animate-ping"></div>
                <div className="relative h-6 w-6 rounded-full bg-green-500 border-2 border-white shadow-md"></div>
            </div>
          </AdvancedMarker>
        )}
      </Map>
      <MapControls />
    </div>
  );
}
