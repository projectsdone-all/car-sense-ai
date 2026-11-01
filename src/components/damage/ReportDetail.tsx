import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, FileDown, Loader2, PencilRuler, Share2, Trash2, Wrench } from "lucide-react";
import { ClaimHelper } from "@/components/damage/ClaimHelper";
import { downloadReportPdf } from "@/lib/pdf-report";
import { SEVERITY_COLOR } from "@/components/damage/DamageImageViewer";
import { DamageEditor } from "@/components/damage/DamageEditor";
import { updateDetections } from "@/lib/reports";
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
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

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
        vehicles: { nickname: string; brand: string; model: string; year?: number | null; registration_number?: string | null } | null;
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
          `• ${damageLabel(detection.class)} on ${detection.part.replace(/_/g, " ")} — ${severityLabel(detection.severity)} ${detection.confidence < 1 ? `(${Math.round(detection.confidence * 100)}% confidence)` : ''}`,
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

  async function handlePdf() {
    if (!data) return;
    setPdfBusy(true);
    try {
      await downloadReportPdf({
        reportId: data.id,
        createdAt: data.created_at,
        source: data.source,
        summary: data.summary ?? null,
        vehicle: data.vehicles,
        imageUrl,
        imageWidth: data.image_width || natural?.w || 0,
        imageHeight: data.image_height || natural?.h || 0,
        detections,
        estimate,
      });
      toast.success("PDF report downloaded.");
    } catch {
      toast.error("The PDF could not be created.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function saveEdits(next: DamageDetection[]) {
    if (!data) return;
    setSavingEdit(true);
    try {
      await updateDetections(reportId, next, data.source);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["report", reportId] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
      ]);
      setEditing(false);
      setActiveIndex(null);
      toast.success("Damage list updated.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Changes could not be saved.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this report? This cannot be undone.")) return;
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
        {imageUrl && editing ? (
          <DamageEditor
            src={imageUrl}
            width={data.image_width || natural?.w || 1}
            height={data.image_height || natural?.h || 1}
            initial={detections}
            saving={savingEdit}
            saveLabel={savingEdit ? "Saving…" : "Save changes"}
            onSave={saveEdits}
            onCancel={() => setEditing(false)}
          />
        ) : imageUrl ? (
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
        {!editing ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {data.source === "gemini"
              ? "Assessed by Gemini vision AI. Something missing or wrong? Tap Edit damage to correct it."
              : data.source === "edited"
                ? "AI result corrected by you."
                : data.source === "manual"
                  ? "Damage marked by you. Costs are calculated from the parts and severity you chose."
                  : data.source === "api"
                    ? "Detected by the YOLOv8 service."
                    : "Demo inference result — simulated detections. Tap Edit damage to mark the real damage."}
          </p>
        ) : null}
        {data.summary && !editing ? (
          <p className="mt-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-relaxed">{data.summary}</p>
        ) : null}
        {!editing && detections.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {(["minor", "moderate", "severe"] as const).map((sev) => (
              <span key={sev} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: SEVERITY_COLOR[sev] }} /> {severityLabel(sev)}
              </span>
            ))}
            <span className="ml-auto">Drag the photo to compare</span>
          </div>
        ) : null}
        {imageUrl && !editing ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button variant="outline" className="min-h-14 flex-col gap-1 text-xs" onClick={() => setEditing(true)}>
              <PencilRuler className="size-4" aria-hidden /> Edit damage
            </Button>
            <Button variant="outline" className="min-h-14 flex-col gap-1 text-xs" onClick={handlePdf} disabled={pdfBusy}>
              {pdfBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />} PDF report
            </Button>
            <Button variant="outline" className="min-h-14 flex-col gap-1 text-xs" onClick={() => setClaimOpen(true)} disabled={detections.length === 0}>
              <FileCheck2 className="size-4" aria-hidden /> Insurance claim
            </Button>
          </div>
        ) : null}
      </div>

      <Section title="Detected damage">
        {detections.length === 0 ? (
          <EmptyState
            title="No visible damage detected."
            description="If the photo shows damage, tap Edit damage above and draw a box around it."
          />
        ) : (
          <ul className="space-y-2">
            {detections.map((detection, index) => (
              <li key={detection.id}>
                <DamageCard
                  index={index}
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

      <ClaimHelper
        open={claimOpen}
        onOpenChange={setClaimOpen}
        reportId={data.id}
        createdAt={data.created_at}
        vehicle={data.vehicles}
        detections={detections}
        estimate={estimate}
      />
    </AppScreen>
  );
}
