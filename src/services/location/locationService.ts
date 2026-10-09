import type { Coordinates } from "@/types";

export class LocationError extends Error {
  constructor(
    message: string,
    public readonly code: "unsupported" | "denied" | "unavailable" | "timeout",
  ) {
    super(message);
  }
}

function toCoordinates(position: GeolocationPosition): Coordinates {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

function toLocationError(error: GeolocationPositionError): LocationError {
  if (error.code === error.PERMISSION_DENIED) {
    return new LocationError("Location access is required for this feature.", "denied");
  }
  if (error.code === error.TIMEOUT) {
    return new LocationError("Getting your location took too long. Try again.", "timeout");
  }
  return new LocationError("Your location could not be determined right now.", "unavailable");
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new LocationError("This device does not support location services.", "unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toCoordinates(position)),
      (error) => reject(toLocationError(error)),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
}

/** Only call when the user explicitly starts a feature that needs live tracking. */
export function watchPosition(
  onUpdate: (coords: Coordinates) => void,
  onError?: (error: LocationError) => void,
): () => void {
  if (!isGeolocationSupported()) {
    onError?.(new LocationError("This device does not support location services.", "unsupported"));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (position) => onUpdate(toCoordinates(position)),
    (error) => onError?.(toLocationError(error)),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function mapsLink(coords: Coordinates): string {
  return `https://www.google.com/maps?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
}

export function directionsLink(coords: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;
}

export function isMapsConfigured(): boolean {
  return Boolean(import.meta.env['VITE_GOOGLE_MAPS_API_KEY']);
}

export function staticMapUrl(coords: Coordinates, zoom = 15): string | null {
  const key = import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] as string | undefined;
  if (!key) return null;
  const center = `${coords.latitude},${coords.longitude}`;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=640x360&scale=2&markers=color:red%7C${center}&key=${key}`;
}
