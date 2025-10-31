"use client";

import { Map, AdvancedMarker, Pin, Circle } from "@vis.gl/react-google-maps";
import type { Outlet } from "@/lib/types";

export function OutletsMap({ outlets }: { outlets: Outlet[] }) {
  return (
    <div className="h-[350px] w-full rounded-lg overflow-hidden border">
      <Map
        mapId="outlets-overview-map"
        defaultCenter={{ lat: 34.0522, lng: -118.2437 }}
        defaultZoom={12}
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
