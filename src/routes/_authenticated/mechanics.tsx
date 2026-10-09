import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { EmptyState, ErrorState, SkeletonList } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { MechanicCard } from "@/components/mechanics/MechanicCard";
import { fetchMechanics } from "@/lib/queries";
import { distanceKm, getCurrentPosition, LocationError } from "@/services/location/locationService";
import type { Coordinates } from "@/types";

export const Route = createFileRoute("/_authenticated/mechanics")({
  head: () => ({
    meta: [
      { title: "Nearby mechanics — Car Sense AI" },
      {
        name: "description",
        content:
          "Find nearby car workshops for body repair, dent removal, painting, general service and emergencies, with call and directions.",
      },
      { property: "og:title", content: "Nearby mechanics — Car Sense AI" },
      {
        property: "og:description",
        content: "Body repair, denting, painting and emergency workshops near you.",
      },
    ],
  }),
  component: MechanicsScreen,
});

const FILTERS = [
  { value: "all", label: "All" },
  { value: "body_repair", label: "Body repair" },
  { value: "dent_repair", label: "Dent repair" },
  { value: "paint", label: "Paint" },
  { value: "general_service", label: "General service" },
  { value: "emergency", label: "Emergency" },
] as const;

function MechanicsScreen() {
  const mechanics = useQuery({ queryKey: ["mechanics"], queryFn: fetchMechanics });
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    getCurrentPosition()
      .then(setCoords)
      .catch((error: unknown) => {
        setLocationError(
          error instanceof LocationError
            ? error.message
            : "Your location could not be determined right now.",
        );
      });
  }, []);

  const list = (mechanics.data ?? [])
    .filter((mechanic) => filter === "all" || mechanic.services.includes(filter))
    .map((mechanic) => ({
      mechanic,
      distance: coords
        ? distanceKm(coords, { latitude: mechanic.latitude, longitude: mechanic.longitude })
        : undefined,
    }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  return (
    <AppScreen>
      <PageHeader title="Nearby Mechanics" description="Workshops and body shops" />

      <div className="border-b border-border px-4 py-3">
        {coords ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-primary" aria-hidden />
            Sorted by distance from your current location
          </p>
        ) : locationError ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{locationError}</p>
            <Button
              variant="outline"
              className="min-h-9 shrink-0 text-xs"
              onClick={() => {
                setLocationError(null);
                getCurrentPosition()
                  .then(setCoords)
                  .catch((error: unknown) =>
                    setLocationError(
                      error instanceof LocationError ? error.message : "Location unavailable.",
                    ),
                  );
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Getting your location…</p>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium ${
              filter === option.value
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Section>
        {mechanics.isLoading ? (
          <SkeletonList />
        ) : mechanics.isError ? (
          <ErrorState
            message="Workshops could not be loaded."
            onRetry={() => mechanics.refetch()}
          />
        ) : list.length === 0 ? (
          <EmptyState
            title="No workshops match this filter."
            description="Try a different service category."
          />
        ) : (
          <ul className="space-y-3">
            {list.map(({ mechanic, distance }) => (
              <li key={mechanic.id}>
                <MechanicCard
                  mechanic={mechanic}
                  {...(distance === undefined ? {} : { distanceKm: distance })}
                />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Workshop listings are curated demo data for this build, not a live directory. Distances
          are calculated from your real location.
        </p>
      </Section>
    </AppScreen>
  );
}
