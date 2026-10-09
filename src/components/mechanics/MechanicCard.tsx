import { Navigation, Phone, Star } from "lucide-react";
import type { Mechanic } from "@/types";
import { formatDistance, humanisePart } from "@/lib/format";
import { directionsLink } from "@/services/location/locationService";
import { Button } from "@/components/ui/button";

export function MechanicCard({
  mechanic,
  distanceKm,
}: {
  mechanic: Mechanic;
  distanceKm?: number;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{mechanic.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{mechanic.address}</p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            mechanic.is_open ? "bg-minor text-minor-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {mechanic.is_open ? "Open" : "Closed"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {mechanic.rating ? (
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-current text-moderate-foreground" aria-hidden />
            {mechanic.rating.toFixed(1)}
          </span>
        ) : null}
        {typeof distanceKm === "number" ? <span>{formatDistance(distanceKm)} away</span> : null}
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {mechanic.services.map((service) => (
          <li
            key={service}
            className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-secondary-foreground"
          >
            {humanisePart(service)}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <a href={`tel:${mechanic.phone ?? ""}`} aria-label={`Call ${mechanic.name}`}>
            <Phone className="size-4" aria-hidden />
            Call
          </a>
        </Button>
        <Button asChild className="min-h-11 flex-1">
          <a
            href={directionsLink({ latitude: mechanic.latitude, longitude: mechanic.longitude })}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation className="size-4" aria-hidden />
            Directions
          </a>
        </Button>
      </div>
    </article>
  );
}
