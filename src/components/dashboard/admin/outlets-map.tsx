
"use client";

import { Map, AdvancedMarker, Pin, useApiIsLoaded } from "@vis.gl/react-google-maps";
import type { Outlet } from "@/lib/types";
import { Circle } from "@/components/map/circle";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export function OutletsMap({ outlets }: { outlets: Outlet[] }) {
  const isLoaded = useApiIsLoaded();

  const mapCenter = useMemo(() => {
    if (outlets.length === 0) {
      return { lat: 20.5937, lng: 78.9629 }; // Default to center of India if no outlets
    }

    const totalLat = outlets.reduce((sum, outlet) => sum + outlet.lat, 0);
    const totalLng = outlets.reduce((sum, outlet) => sum + outlet.lng, 0);

    return {
      lat: totalLat / outlets.length,
      lng: totalLng / outlets.length,
    };
  }, [outlets]);

  if (!isLoaded) {
    return <Skeleton className="h-[350px] w-full" />
  }

  return (
    <div className="h-[350px] w-full rounded-lg overflow-hidden border">
      <Map
        mapId="outlets-overview-map"
        defaultCenter={mapCenter}
        defaultZoom={11}
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
            strokeColor="#90EE90"
            strokeOpacity={0.8}
            strokeWeight={2}
            fillColor="#90EE90"
            fillOpacity={0.25}
          />
        ))}
      </Map>
    </div>
  );
}
