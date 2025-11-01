import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates the distance between two GPS coordinates in meters.
 * @param coords1 - The first coordinate { latitude: number, longitude: number }.
 * @param coords2 - The second coordinate { lat: number, lng: number }.
 * @returns The distance in meters.
 */
export function haversineDistance(
  coords1: { latitude: number; longitude: number },
  coords2: { lat: number; lng: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;

  const R = 6371e3; // Earth's radius in meters
  const dLat = toRad(coords2.lat - coords1.latitude);
  const dLon = toRad(coords2.lng - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

