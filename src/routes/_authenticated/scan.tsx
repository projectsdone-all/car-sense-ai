import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, ImageUp, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/States";
import { db } from "@/lib/db";
import { detectDamage, getInferenceMode, MODE_LABEL } from "@/services/ai/damageDetectionService";
import { uploadVehicleImage } from "@/lib/vehicle-storage";
import { estimateRepairCost, fetchRepairCosts } from "@/lib/repair-cost";
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

const STAGES = [
  "Preparing image…",
  "Analyzing vehicle…",
  "Identifying visible damage…",
  "Preparing repair estimate…",
];

function ScanScreen() {
  const navigate = useNavigate();
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
  const mode = useQuery({ queryKey: ["inference-mode"], queryFn: getInferenceMode });

  useEffect(() => {
    const list = vehicles.data ?? [];
    if (list.length === 0) return;
    const stored = readSelectedVehicleId();
    setVehicleId(stored && list.some((v) => v.id === stored) ? stored : list[0]!.id);
  }, [vehicles.data]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePicked(picked: File | undefined) {
    if (!picked) return;
    setError(null);
    setFile(picked);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(picked);
    });
  }

  async function analyse() {
    if (!file) return;
    setError(null);
    setStage(0);
    try {
      const { data: userData } = await db.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Your session expired. Please sign in again.");

      setStage(1);
      const [result, imagePath, costRows] = await Promise.all([
        detectDamage(file),
        uploadVehicleImage(userId, file),
        fetchRepairCosts(),
      ]);

      setStage(2);
      const estimate = estimateRepairCost(result.detections, costRows);

      setStage(3);
      const { data: report, error: reportError } = await db
        .from("damage_reports")
        .insert({
          user_id: userId,
          vehicle_id: vehicleId,
          image_path: imagePath,
          analysis_status: "completed",
          source: result.source,
          image_width: result.imageWidth,
          image_height: result.imageHeight,
          summary: result.summary ?? null,
          min_cost: Math.min(estimate.local_mechanic.min, estimate.showroom.min),
          max_cost: Math.max(estimate.local_mechanic.max, estimate.showroom.max),
        })
        .select("id")
        .single();
      if (reportError) throw reportError;

      if (result.detections.length > 0) {
        const { error: detectionError } = await db.from("damage_detections").insert(
          result.detections.map((detection) => ({
            report_id: report.id,
            damage_type: detection.class,
            severity: detection.severity,
            confidence: detection.confidence,
            affected_part: detection.part,
            bbox_x: detection.bbox.x,
            bbox_y: detection.bbox.y,
            bbox_width: detection.bbox.width,
            bbox_height: detection.bbox.height,
          })),
        );
        if (detectionError) throw detectionError;
      }

      toast.success("Damage report saved.");
      navigate({ to: "/analysis/$reportId", params: { reportId: report.id } });
    } catch (caught) {
      setStage(-1);
      setError(
        caught instanceof Error
          ? caught.message
          : "Damage analysis is temporarily unavailable. Please try again.",
      );
    }
  }

  const analysing = stage >= 0;

  return (
    <AppScreen>
      <PageHeader title="Scan Vehicle" description={mode.data ? MODE_LABEL[mode.data] : "Checking AI…"} backTo="/" />

      {mode.data === "demo" ? (
        <p className="mx-4 mt-4 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Demo inference is active, so results are simulated sample detections. For real AI damage
          detection, add a free Gemini API key on the{" "}
          <Link to="/profile" className="font-medium text-primary underline">
            Profile
          </Link>{" "}
          screen.
        </p>
      ) : null}

      <Section title="Vehicle">
        <VehiclePicker
          vehicles={vehicles.data ?? []}
          loading={vehicles.isLoading}
          selectedId={vehicleId}
          onSelect={setVehicleId}
        />
      </Section>

      <Section title="Photo">
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => handlePicked(event.target.files?.[0])}
        />
        <input
          ref={uploadInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => handlePicked(event.target.files?.[0])}
        />

        {previewUrl ? (
          <figure className="overflow-hidden rounded-xl border border-border bg-muted">
            <img src={previewUrl} alt="Selected vehicle photo" className="block w-full" />
          </figure>
        ) : (
          <div className="grid gap-2">
            <Button
              type="button"
              className="min-h-12 w-full text-base"
              onClick={() => cameraInput.current?.click()}
            >
              <Camera className="size-5" aria-hidden />
              Take Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full text-base"
              onClick={() => uploadInput.current?.click()}
            >
              <ImageUp className="size-5" aria-hidden />
              Upload Photo
            </Button>
          </div>
        )}
      </Section>

      {error ? (
        <div className="px-4 pb-2">
          <ErrorState message={error} onRetry={() => setError(null)} />
        </div>
      ) : null}

      {previewUrl ? (
        <div
          className="sticky bottom-20 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          {analysing ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span aria-live="polite">{STAGES[stage]}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 flex-1"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return null;
                  });
                }}
              >
                <RotateCcw className="size-4" aria-hidden />
                Retake
              </Button>
              <Button type="button" className="min-h-12 flex-[1.4] text-base" onClick={analyse}>
                Analyze Damage
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </AppScreen>
  );
}
