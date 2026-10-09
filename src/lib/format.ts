import type { DamageType, Severity } from "@/types";

export function formatInr(value: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatRange(min: number, max: number): string {
  return `${formatInr(min)} – ${formatInr(max)}`;
}

export function humanisePart(part: string): string {
  return part
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const DAMAGE_LABELS: Record<DamageType, string> = {
  scratch: "Scratch",
  dent: "Dent",
  crack: "Crack",
  broken_part: "Broken Part",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  minor: "Minor",
  moderate: "Moderate",
  severe: "Severe",
};

export function damageLabel(type: string): string {
  return DAMAGE_LABELS[type as DamageType] ?? humanisePart(type);
}

export function severityLabel(severity: string): string {
  return SEVERITY_LABELS[severity as Severity] ?? humanisePart(severity);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
