import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImageUp, Loader2, PencilRuler, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/States";
import { detectDamage, getInferenceMode, MODE_LABEL } from "@/services/ai/damageDetectionService";
import { prepareImage, saveReport, type ReportSource } from "@/lib/reports";
import { DamageEditor } from "@/components/damage/DamageEditor";
import type { DamageDetection } from "@/types";
import { fetchVehicles, readSelectedVehicleId } from "@/lib/queries";
import { VehiclePicker } from "@/components/vehicle/VehiclePicker";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan your vehicle — Car Sense AI" },
      {
        name: "description",
        content:
          "Take or upload a photo of your vehicle and let Car Sense AI identify visible dents, scratches, cracks and broken parts.",
      },
      { property: "og:title", content: "Scan your vehicle — Car Sense AI" },
      {
        property: "og:description",
        content: "Capture a photo and get damage detection with a repair estimate in seconds.",
      },
    ],
  }),
  component: ScanScreen,
});

function ScanScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ file: File; url: string; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [review, setReview] = useState<{ detections: DamageDetection[]; source: ReportSource; summary?: string } | null>(null);

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
  const mode = useQuery({ queryKey: ["inference-mode"], queryFn: getInferenceMode });
  const hasAi = mode.data !== undefined && mode.data !== "demo";

  useEffect(() => {
    const list = vehicles.data ?? [];
    if (list.length === 0) return;
    const stored = readSelectedVehicleId();
    setVehicleId(stored && list.some((v) => v.id === stored) ? stored : list[0]!.id);
  }, [vehicles.data]);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  async function handlePicked(picked: File | undefined) {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setError("Please choose a photo (JPG or PNG).");
      return;
    }
    setError(null);
    setReview(null);
    setBusy("Preparing photo…");
    try {
      const prepared = await prepareImage(picked);
      setPhoto({ ...prepared, url: URL.createObjectURL(prepared.file) });
    } catch {
      setError("This photo could not be opened. Try another one.");
    } finally {
      setBusy(null);
    }
  }

  async function analyse() {
    if (!photo) return;
    setError(null);
    setBusy("AI is inspecting the photo…");
    try {
      const result = await detectDamage(photo.file);
      // boxes from the AI are measured on the same compressed image we keep
      const sx = photo.width / (result.imageWidth || photo.width);
      const sy = photo.height / (result.imageHeight || photo.height);
      const detections = result.detections.map((d) => ({ ...d, bbox: { x: d.bbox.x * sx, y: d.bbox.y * sy, width: d.bbox.width * sx, height: d.bbox.height * sy } }));
      setReview({ detections, source: result.source, ...(result.summary ? { summary: result.summary } : {}) });
      if (!detections.length) toast.info("No visible damage found. Draw a box if the AI missed something.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Damage analysis is temporarily unavailable. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function save(detections: DamageDetection[]) {
    if (!photo || !review) return;
    setBusy("Saving report…");
    try {
      const changed = JSON.stringify(detections) !== JSON.stringify(review.detections);
      const reportId = await saveReport({
        file: photo.file, width: photo.width, height: photo.height, vehicleId,
        source: review.source === "manual" ? "manual" : changed ? "edited" : review.source,
        detections, summary: review.summary ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Damage report saved.");
      navigate({ to: "/analysis/$reportId", params: { reportId } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report could not be saved.");
      setBusy(null);
    }
  }

  function reset() {
    setPhoto(null);
    setReview(null);
    setError(null);
  }

  return (
    <AppScreen>
      <PageHeader title="Scan Vehicle" description={mode.data ? MODE_LABEL[mode.data] : "Checking AI…"} backTo="/" />

      {mode.data === "demo" ? (
        <p className="mx-4 mt-4 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          AI detection is not connected, so you mark the damage yourself and the app prices the repair. For automatic
          detection, add a free Gemini API key on the{" "}
          <Link to="/profile" className="font-medium text-primary underline">Profile</Link> screen (or set
          <code className="mx-1">GEMINI_API_KEY</code>in Vercel).
        </p>
      ) : null}

      <Section title="Vehicle">
        <VehiclePicker vehicles={vehicles.data ?? []} loading={vehicles.isLoading} selectedId={vehicleId} onSelect={setVehicleId} />
      </Section>

      <Section title={review ? (review.source === "manual" ? "Mark the damage" : "Check what the AI found") : "Photo"}>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void handlePicked(event.target.files?.[0]); event.target.value = ""; }} />
        <input ref={uploadInput} type="file" accept="image/*" className="sr-only" onChange={(event) => { void handlePicked(event.target.files?.[0]); event.target.value = ""; }} />

        {review && photo ? (
          <>
            {review.summary ? <p className="mb-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">{review.summary}</p> : null}
            <DamageEditor
              src={photo.url}
              width={photo.width}
              height={photo.height}
              initial={review.detections}
              saving={busy !== null}
              saveLabel={busy ?? "Save report"}
              onSave={save}
              onCancel={() => setReview(null)}
            />
          </>
        ) : photo ? (
          <figure className="overflow-hidden rounded-xl border border-border bg-muted">
            <img src={photo.url} alt="Selected vehicle photo" className="block w-full" />
          </figure>
        ) : (
          <div className="grid gap-2">
            <Button type="button" className="min-h-12 w-full text-base" onClick={() => cameraInput.current?.click()} disabled={busy !== null}>
              <Camera className="size-5" aria-hidden /> Take Photo
            </Button>
            <Button type="button" variant="outline" className="min-h-12 w-full text-base" onClick={() => uploadInput.current?.click()} disabled={busy !== null}>
              <ImageUp className="size-5" aria-hidden /> Upload Photo
            </Button>
            <p className="pt-1 text-xs text-muted-foreground">Tip: stand 1–2 m away in good light so the whole damaged area is in the photo.</p>
          </div>
        )}
      </Section>

      {error ? (
        <div className="px-4 pb-2">
          <ErrorState message={error} onRetry={() => setError(null)} />
        </div>
      ) : null}

      {photo && !review ? (
        <div className="sticky bottom-20 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          {busy ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span aria-live="polite">{busy}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="min-h-12 flex-1" onClick={reset}>
                <RotateCcw className="size-4" aria-hidden /> Retake
              </Button>
              {hasAi ? (
                <Button type="button" className="min-h-12 flex-[1.4] text-base" onClick={analyse}>Analyze Damage</Button>
              ) : (
                <Button type="button" className="min-h-12 flex-[1.4] text-base" onClick={() => setReview({ detections: [], source: "manual" })} disabled={mode.isLoading}>
                  <PencilRuler className="size-4" aria-hidden /> Mark Damage
                </Button>
              )}
            </div>
          )}
        </div>
      ) : null}
    </AppScreen>
  );
}
