"use client";

import { Map, AdvancedMarker, Pin, Circle } from "@vis.gl/react-google-maps";
import type { Outlet } from "@/lib/types";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useEffect, useState } from "react";

export function SalesLiveMap({ outlets }: { outlets: Outlet[] }) {
  const { coords } = useGeolocation();
  const [center, setCenter] = useState({ lat: 34.0522, lng: -118.2437 });

  useEffect(() => {
    if (coords) {
      setCenter({ lat: coords.latitude, lng: coords.longitude });
    } else if (outlets.length > 0) {
      setCenter({ lat: outlets[0].lat, lng: outlets[0].lng });
    }
  }, [coords, outlets]);

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border">
      <Map
        mapId="sales-live-map"
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
            radius={150}
            strokeColor="#2E3192"
            strokeOpacity={0.3}
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
    </div>
  );
}
