import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { DamageImageViewer } from "@/components/damage/DamageImageViewer";
import { DamageCard } from "@/components/damage/DamageCard";
import { CostEstimate } from "@/components/damage/CostEstimate";
import { RepairGuidance } from "@/components/damage/RepairGuidance";
import { fetchGuides, fetchReport } from "@/lib/queries";
import { estimateRepairCost, fetchRepairCosts } from "@/lib/repair-cost";
import { getVehicleImageUrl } from "@/lib/vehicle-storage";
import { damageLabel, formatDate, formatRange, severityLabel } from "@/lib/format";
import { shareText } from "@/services/notification/notificationService";
import type { DamageDetection, DamageType, Severity } from "@/types";

interface DetectionRow {
  id: string;
  damage_type: string;
  severity: string;
  confidence: number;
  affected_part: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
}

export function ReportDetail({ reportId, backTo }: { reportId: string; backTo: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const report = useQuery({ queryKey: ["report", reportId], queryFn: () => fetchReport(reportId) });
  const costs = useQuery({ queryKey: ["repair-costs"], queryFn: fetchRepairCosts });
  const guides = useQuery({ queryKey: ["guides"], queryFn: fetchGuides });

  const imagePath = (report.data as { image_path?: string | null } | null)?.image_path ?? null;

  useEffect(() => {
    let active = true;
    if (!imagePath) return;
    getVehicleImageUrl(imagePath).then((url) => {
      if (active) setImageUrl(url);
    });
    return () => {
      active = false;
    };
  }, [imagePath]);

  if (report.isLoading) {
    return (
      <AppScreen>
        <PageHeader title="Vehicle Damage Report" backTo={backTo} />
        <div className="px-4">
          <LoadingState label="Loading report…" />
        </div>
      </AppScreen>
    );
  }

  if (report.isError) {
    return (
      <AppScreen>
        <PageHeader title="Vehicle Damage Report" backTo={backTo} />
        <div className="p-4">
          <ErrorState message="This report could not be loaded." onRetry={() => report.refetch()} />
        </div>
      </AppScreen>
    );
  }

  const data = report.data as
    | {
        id: string;
        created_at: string;
        source: string;
        summary?: string | null;
        image_width?: number | null;
        image_height?: number | null;
        damage_detections: DetectionRow[];
        vehicles: { nickname: string; brand: string; model: string } | null;
      }
    | null;

  if (!data) {
    return (
      <AppScreen>
        <PageHeader title="Vehicle Damage Report" backTo={backTo} />
        <div className="p-4">
          <EmptyState
            title="Report not found."
            description="It may have been deleted from your history."
            action={
              <Button asChild className="min-h-11">
                <Link to="/history">Go to History</Link>
              </Button>
            }
          />
        </div>
      </AppScreen>
    );
  }

  const detections: DamageDetection[] = (data.damage_detections ?? []).map((row) => ({
    id: row.id,
    class: row.damage_type as DamageType,
    severity: row.severity as Severity,
    confidence: Number(row.confidence),
    part: row.affected_part,
    bbox: {
      x: Number(row.bbox_x),
      y: Number(row.bbox_y),
      width: Number(row.bbox_width),
      height: Number(row.bbox_height),
    },
  }));

  const estimate = estimateRepairCost(detections, costs.data ?? []);

  async function handleShare() {
    const summary = [
      "Car Sense AI — Vehicle Damage Report",
      data ? `Date: ${formatDate(data.created_at)}` : "",
      ...detections.map(
        (detection) =>
          `• ${damageLabel(detection.class)} on ${detection.part.replace(/_/g, " ")} — ${severityLabel(detection.severity)} (${Math.round(detection.confidence * 100)}% confidence)`,
      ),
      `Authorized service center: ${formatRange(estimate.showroom.min, estimate.showroom.max)}`,
      `Local mechanic: ${formatRange(estimate.local_mechanic.min, estimate.local_mechanic.max)}`,
      "Estimated costs only. Actual prices may vary.",
    ]
      .filter(Boolean)
      .join("\n");

    const outcome = await shareText({ title: "Vehicle Damage Report", text: summary });
    if (outcome === "shared") toast.success("Report shared.");
    else if (outcome === "copied") toast.success("Report summary copied.");
    else if (outcome === "unsupported") toast.error("Sharing is not available on this device.");
  }

  async function handleDelete() {
    const { error } = await db.from("damage_reports").delete().eq("id", reportId);
    if (error) {
      toast.error("Report could not be deleted.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["reports"] });
    toast.success("Report deleted.");
    navigate({ to: "/history" });
  }

  return (
    <AppScreen>
      <PageHeader
        title="Vehicle Damage Report"
        description={`${formatDate(data.created_at)}${data.vehicles ? ` · ${data.vehicles.nickname}` : ""}`}
        backTo={backTo}
      />

      <div className="px-4 pt-4">
        {imageUrl ? (
          <DamageImageViewer
            src={imageUrl}
            detections={detections}
            imageWidth={data.image_width ?? 0}
            imageHeight={data.image_height ?? 0}
            activeIndex={activeIndex}
          />
        ) : (
          <div className="h-48 animate-pulse rounded-xl border border-border bg-muted" />
        )}
        {data.source === "mock" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Demo inference result — simulated detections, not a live model prediction.
          </p>
        ) : data.source === "gemini" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Assessed by Gemini vision AI. Confirm with a mechanic before booking repairs.
          </p>
        ) : null}
        {data.summary ? (
          <p className="mt-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">{data.summary}</p>
        ) : null}
      </div>

      <Section title="Detected damage">
        {detections.length === 0 ? (
          <EmptyState
            title="No visible damage detected."
            description="Try a closer, well-lit photo of the affected panel."
          />
        ) : (
          <ul className="space-y-2">
            {detections.map((detection, index) => (
              <li key={detection.id}>
                <DamageCard
                  detection={detection}
                  active={activeIndex === index}
                  onFocus={() => setActiveIndex(activeIndex === index ? null : index)}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {detections.length > 0 ? (
        <>
          <Section title="Repair estimate">
            <CostEstimate estimate={estimate} />
          </Section>

          <Section title="What you can do">
            <RepairGuidance detections={detections} guides={guides.data ?? []} />
          </Section>
        </>
      ) : null}

      <Section>
        <div className="grid gap-2">
          <Button asChild className="min-h-12 text-base">
            <Link to="/mechanics">
              <Wrench className="size-4" aria-hidden />
              Find Mechanic
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-12 flex-1" onClick={handleShare}>
              <Share2 className="size-4" aria-hidden />
              Share Report
            </Button>
            <Button variant="ghost" className="min-h-12" onClick={handleDelete}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            This report is saved in your History.
          </p>
        </div>
      </Section>
    </AppScreen>
  );
}
