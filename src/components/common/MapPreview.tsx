import type { Coordinates } from "@/types";

/** Free OpenStreetMap preview — no API key needed */
export function MapPreview({ coords, height = 200, label = "Map of your location" }: { coords: Coordinates; height?: number; label?: string }) {
  const d = 0.004;
  const { latitude: lat, longitude: lng } = coords;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d * 0.6},${lng + d},${lat + d * 0.6}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <iframe
      title={label}
      src={src}
      loading="lazy"
      className="block w-full border-0 border-b border-border bg-muted"
      style={{ height }}
    />
  );
}
