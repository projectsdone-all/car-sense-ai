import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Navigation, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MapPreview } from "@/components/common/MapPreview";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { EmptyState, ErrorState, SkeletonList } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { fetchParking } from "@/lib/queries";
import {
  distanceKm,
  getCurrentPosition,
  LocationError,
  mapsLink,
  staticMapUrl,
} from "@/services/location/locationService";
import { formatCoords, formatDate, formatDistance } from "@/lib/format";
import type { Coordinates } from "@/types";

export const Route = createFileRoute("/_authenticated/parking")({
  head: () => ({
    meta: [
      { title: "Parking — Car Sense AI" },
      {
        name: "description",
        content:
          "Save exactly where you parked and navigate back to it later, with your current location and distance.",
      },
      { property: "og:title", content: "Parking — Car Sense AI" },
      { property: "og:description", content: "Never lose your parked car again." },
    ],
  }),
  component: ParkingScreen,
});

function ParkingScreen() {
  const queryClient = useQueryClient();
  const spots = useQuery({ queryKey: ["parking"], queryFn: fetchParking });
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  function locate() {
    setLocationError(null);
    getCurrentPosition()
      .then(setCoords)
      .catch((error: unknown) =>
        setLocationError(
          error instanceof LocationError
            ? error.message
            : "Your location could not be determined right now.",
        ),
      );
  }

  useEffect(locate, []);

  const save = useMutation({
    mutationFn: async () => {
      if (!coords) throw new Error("Location access is required for this feature.");
      const { data: userData } = await db.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Your session expired. Please sign in again.");
      const { error } = await db.from("parking_locations").insert({
        user_id: userId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        name: name.trim() || "Parked here",
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setName("");
      setNote("");
      toast.success("Parking location saved.");
      await queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("parking_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Parking location removed.");
      await queryClient.invalidateQueries({ queryKey: ["parking"] });
    },
  });

  const mapImage = coords ? staticMapUrl(coords) : null;

  return (
    <AppScreen>
      <PageHeader title="Parking" description="Save and find your parked vehicle" />

      <Section title="Current location">
        {coords ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            {mapImage ? (
              <img src={mapImage} alt="Map of your current location" className="block w-full" />
            ) : (
              <MapPreview coords={coords} />
            )}
            <div className="px-4 py-3">
              <p className="text-sm font-medium tabular-nums">
                {formatCoords(coords.latitude, coords.longitude)}
              </p>
              {coords.accuracy ? (
                <p className="text-xs text-muted-foreground">
                  Accuracy ±{Math.round(coords.accuracy)} m
                </p>
              ) : null}
            </div>
          </div>
        ) : locationError ? (
          <ErrorState message={locationError} onRetry={locate} />
        ) : (
          <SkeletonList rows={1} />
        )}
      </Section>

      <Section title="Save this spot">
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="space-y-1.5">
            <Label htmlFor="spot-name">Name</Label>
            <Input
              id="spot-name"
              placeholder="Level 2, Phoenix Mall"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="spot-note">Note (optional)</Label>
            <Input
              id="spot-note"
              placeholder="Near lift B, pillar 14"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-11"
            />
          </div>
          <Button
            className="min-h-12 w-full"
            disabled={!coords || save.isPending}
            onClick={() => save.mutate()}
          >
            Save Parking Location
          </Button>
        </div>
      </Section>

      <Section title="Saved spots">
        {spots.isLoading ? (
          <SkeletonList rows={2} />
        ) : spots.isError ? (
          <ErrorState message="Saved spots could not be loaded." onRetry={() => spots.refetch()} />
        ) : (spots.data ?? []).length === 0 ? (
          <EmptyState
            title="No parking spots saved."
            description="Save your spot before walking away so you can navigate back."
          />
        ) : (
          <ul className="space-y-2">
            {(spots.data ?? []).map((spot) => (
              <li
                key={spot.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{spot.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(spot.created_at)}
                    {coords
                      ? ` · ${formatDistance(distanceKm(coords, { latitude: Number(spot.latitude), longitude: Number(spot.longitude) }))} away`
                      : ""}
                  </p>
                  {spot.note ? (
                    <p className="truncate text-xs text-muted-foreground">{spot.note}</p>
                  ) : null}
                </div>
                <Button asChild variant="outline" size="icon" className="min-h-11 min-w-11">
                  <a
                    href={mapsLink({
                      latitude: Number(spot.latitude),
                      longitude: Number(spot.longitude),
                    })}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Navigate to ${spot.name}`}
                  >
                    <Navigation className="size-4" aria-hidden />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label={`Delete ${spot.name}`}
                  onClick={() => remove.mutate(spot.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </AppScreen>
  );
}
