"use client";

import { Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import type { Outlet } from "@/lib/types";
import { Circle } from "@/components/map/circle";

export function OutletsMap({ outlets }: { outlets: Outlet[] }) {
  
  const mapCenter = outlets.length > 0 
    ? { lat: outlets[0].lat, lng: outlets[0].lng } 
    : { lat: 34.0522, lng: -118.2437 };

  return (
    <div className="h-[350px] w-full rounded-lg overflow-hidden border">
      <Map
        mapId="outlets-management-map"
        defaultCenter={mapCenter}
        defaultZoom={outlets.length > 0 ? 11 : 9}
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
