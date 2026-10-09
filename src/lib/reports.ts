import { db } from "@/lib/db";
import { compressImage } from "@/lib/image";
import { uploadVehicleImage } from "@/lib/vehicle-storage";
import { estimateRepairCost, fetchRepairCosts } from "@/lib/repair-cost";
import type { DamageDetection, DetectionResult } from "@/types";

export type ReportSource = DetectionResult["source"] | "manual" | "edited";

export async function imageSize(file: Blob): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 1024, height: 768 });
        img.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** The exact image that gets stored — boxes are always measured against this one */
export async function prepareImage(file: File) {
  const small = await compressImage(file);
  const size = await imageSize(small);
  return { file: small, ...size };
}

const toRows = (reportId: string, detections: DamageDetection[]) =>
  detections.map((d) => ({
    report_id: reportId,
    damage_type: d.class,
    severity: d.severity,
    confidence: d.confidence,
    affected_part: d.part,
    bbox_x: Math.round(d.bbox.x),
    bbox_y: Math.round(d.bbox.y),
    bbox_width: Math.round(d.bbox.width),
    bbox_height: Math.round(d.bbox.height),
  }));

async function costs(detections: DamageDetection[]) {
  const e = estimateRepairCost(detections, await fetchRepairCosts());
  return detections.length
    ? { min_cost: Math.min(e.local_mechanic.min, e.showroom.min), max_cost: Math.max(e.local_mechanic.max, e.showroom.max) }
    : { min_cost: 0, max_cost: 0 };
}

export async function saveReport(opts: {
  file: File;
  width: number;
  height: number;
  vehicleId: string | null;
  source: ReportSource;
  detections: DamageDetection[];
  summary?: string | null;
}): Promise<string> {
  const { data: userData } = await db.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Your session expired. Please sign in again.");
  const imagePath = await uploadVehicleImage(userId, opts.file);
  const { data: report, error } = await db
    .from("damage_reports")
    .insert({
      user_id: userId,
      vehicle_id: opts.vehicleId,
      image_path: imagePath,
      analysis_status: "completed",
      source: opts.source,
      image_width: opts.width,
      image_height: opts.height,
      summary: opts.summary ?? null,
      ...(await costs(opts.detections)),
    })
    .select("id")
    .single();
  if (error) throw error;
  if (opts.detections.length) {
    const { error: detError } = await db.from("damage_detections").insert(toRows(report.id, opts.detections));
    if (detError) throw detError;
  }
  return report.id as string;
}

/** Replace a report's damage list after the user corrects it */
export async function updateDetections(reportId: string, detections: DamageDetection[], wasSource: string) {
  const { error: delError } = await db.from("damage_detections").delete().eq("report_id", reportId);
  if (delError) throw delError;
  if (detections.length) {
    const { error } = await db.from("damage_detections").insert(toRows(reportId, detections));
    if (error) throw error;
  }
  const source = wasSource === "manual" ? "manual" : "edited";
  const { error: upError } = await db.from("damage_reports").update({ ...(await costs(detections)), source }).eq("id", reportId);
  if (upError) throw upError;
}
