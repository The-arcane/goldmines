
"use client";

import { useState, useEffect } from 'react';

interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocationState {
  loading: boolean;
  error: GeolocationPositionError | null;
  coords: GeolocationCoordinates | null;
}

export const useGeolocation = (options: PositionOptions = {}): GeolocationState => {
  const [state, setState] = useState<GeolocationState>({
    loading: true,
    error: null,
    coords: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, loading: false, error: new GeolocationPositionError() }));
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        loading: false,
        error: null,
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setState({
        loading: false,
        error,
        coords: null,
      });
    };

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(options)]);

  return state;
};

// Mock GeolocationPositionError for server-side rendering or environments without navigator
class GeolocationPositionError extends Error {
  readonly code: number = 0;
  readonly PERMISSION_DENIED: number = 1;
  readonly POSITION_UNAVAILABLE: number = 2;
  readonly TIMEOUT: number = 3;

  constructor() {
    super("Geolocation is not supported by this browser.");
    this.name = "GeolocationPositionError";
  }
}
