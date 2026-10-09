import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MapPin, Radio, Share2, Siren } from "lucide-react";
import { toast } from "sonner";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/States";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db } from "@/lib/db";
import {
  getCurrentPosition,
  LocationError,
  mapsLink,
  watchPosition,
} from "@/services/location/locationService";
import { isSmsProviderConfigured, shareText } from "@/services/notification/notificationService";
import { formatCoords } from "@/lib/format";
import type { Coordinates } from "@/types";

export const Route = createFileRoute("/_authenticated/sos")({
  head: () => ({
    meta: [
      { title: "SOS emergency — Car Sense AI" },
      {
        name: "description",
        content:
          "Share your exact location with someone you trust in a roadside emergency, with optional live location sharing.",
      },
      { property: "og:title", content: "SOS emergency — Car Sense AI" },
      { property: "og:description", content: "Share your location fast when you need help." },
    ],
  }),
  component: SosScreen,
});

function SosScreen() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [stopWatch, setStopWatch] = useState<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopWatch?.();
    };
  }, [stopWatch]);

  async function activate() {
    setConfirmOpen(false);
    setLoading(true);
    setError(null);
    try {
      const position = await getCurrentPosition();
      setCoords(position);
      const { data: userData } = await db.auth.getUser();
      if (userData.user) {
        await db.from("emergency_events").insert({
          user_id: userData.user.id,
          latitude: position.latitude,
          longitude: position.longitude,
          message: "Emergency assistance requested from Car Sense AI",
        });
      }
    } catch (caught) {
      setError(
        caught instanceof LocationError
          ? caught.message
          : "Your location could not be determined right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!coords) return;
    const link = mapsLink(coords);
    const outcome = await shareText({
      title: "Emergency location",
      text: `Emergency! I may need assistance. My current location is:`,
      url: link,
    });
    if (outcome === "shared") toast.success("Location shared.");
    else if (outcome === "copied") toast.success("Location copied.");
    else if (outcome === "unsupported") toast.error("Sharing is not available on this device.");
  }

  function toggleTracking() {
    if (tracking) {
      stopWatch?.();
      setStopWatch(null);
      setTracking(false);
      toast.success("Location sharing stopped.");
      return;
    }
    const stop = watchPosition(setCoords, (locationError) => setError(locationError.message));
    setStopWatch(() => stop);
    setTracking(true);
  }

  return (
    <AppScreen>
      <PageHeader title="SOS Emergency" description="Roadside assistance" backTo="/" />

      <Section>
        <div className="rounded-xl border border-border bg-surface p-5 text-center shadow-card">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-severe text-severe-foreground">
            <Siren className="size-7" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Need help right now?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Car Sense AI will read your current location so you can send it to someone you trust.
          </p>
          <Button
            className="mt-5 min-h-12 w-full text-base"
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            SOS
          </Button>
        </div>
      </Section>

      {error ? (
        <div className="px-4 pb-2">
          <ErrorState message={error} onRetry={activate} />
        </div>
      ) : null}

      {coords ? (
        <>
          <Section title="Your location">
            <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
              <p className="flex items-center gap-2 text-sm font-medium tabular-nums">
                <MapPin className="size-4 text-primary" aria-hidden />
                {formatCoords(coords.latitude, coords.longitude)}
              </p>
              {coords.accuracy ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Accuracy ±{Math.round(coords.accuracy)} m
                </p>
              ) : null}
              <a
                href={mapsLink(coords)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-medium text-primary underline"
              >
                Open in Maps
              </a>
            </div>
          </Section>

          <Section>
            <div className="grid gap-2">
              <Button className="min-h-12 text-base" onClick={share}>
                <Share2 className="size-4" aria-hidden />
                Share Location
              </Button>
              <Button variant="outline" className="min-h-12" onClick={toggleTracking}>
                <Radio className="size-4" aria-hidden />
                {tracking ? "Stop live location sharing" : "Start live location sharing"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Live sharing is {tracking ? "active" : "inactive"}.
                {isSmsProviderConfigured()
                  ? ""
                  : " No SMS provider is connected, so nothing is texted automatically — share the link yourself."}
              </p>
            </div>
          </Section>
        </>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start emergency location sharing?</AlertDialogTitle>
            <AlertDialogDescription>
              Car Sense AI will read your current location and prepare a shareable emergency
              message. Nothing is sent until you share it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={activate}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppScreen>
  );
}
