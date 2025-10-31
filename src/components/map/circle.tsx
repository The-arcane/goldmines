"use client";

import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";

// This is a workaround for a bug in @vis.gl/react-google-maps
// that causes the Circle component to not be exported correctly.
// see: https://github.com/visgl/react-google-maps/issues/597
export const Circle = (props: google.maps.CircleOptions) => {
  const [circle, setCircle] = useState<google.maps.Circle | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (circle) circle.setMap(null);
    setCircle(new google.maps.Circle({ ...props, map }));

    return () => {
      if (circle) {
        circle.setMap(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, props]);

  return null;
};
