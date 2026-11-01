import type { DamageDetection, RepairEstimate } from "@/types";
import { damageLabel, formatDate, humanisePart, severityLabel } from "@/lib/format";

export interface PdfReportInput {
  reportId: string;
  createdAt: string;
  source: string;
  summary?: string | null;
  vehicle?: { nickname?: string; brand?: string; model?: string; year?: number | null; registration_number?: string | null } | null;
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  detections: DamageDetection[];
  estimate: RepairEstimate;
}

const SEV_RGB: Record<string, [number, number, number]> = {
  minor: [52, 199, 132],
  moderate: [240, 180, 40],
  severe: [230, 72, 52],
};
// jsPDF's built-in fonts have no ₹ glyph, so amounts use "Rs."
const inr = (n: number) => `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
const range = (r: { min: number; max: number }) => `${inr(r.min)} - ${inr(r.max)}`;

async function annotatedImage(input: PdfReportInput): Promise<{ data: string; w: number; h: number } | null> {
  if (!input.imageUrl) return null;
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = input.imageUrl!;
  });
  if (!img) return null;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const sx = w / (input.imageWidth || w);
  const sy = h / (input.imageHeight || h);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const line = Math.max(3, Math.round(w / 260));
  ctx.font = `bold ${Math.max(14, Math.round(w / 55))}px sans-serif`;
  input.detections.forEach((d, i) => {
    const [r, g, b] = SEV_RGB[d.severity] ?? [0, 200, 230];
    const x = d.bbox.x * sx, y = d.bbox.y * sy, bw = d.bbox.width * sx, bh = d.bbox.height * sy;
    ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = line;
    ctx.strokeRect(x, y, bw, bh);
    const label = `${i + 1}. ${damageLabel(d.class)}`;
    const tw = ctx.measureText(label).width + 12;
    const th = Math.max(20, Math.round(w / 40));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x - line / 2, Math.max(0, y - th), tw, th);
    ctx.fillStyle = "#0d1220";
    ctx.fillText(label, x + 6 - line / 2, Math.max(th * 0.75, y - th * 0.27));
  });
  return { data: canvas.toDataURL("image/jpeg", 0.85), w, h };
}

export async function downloadReportPdf(input: PdfReportInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = 0;

  // header band
  doc.setFillColor(13, 18, 32);
  doc.rect(0, 0, W, 96, "F");
  doc.setFillColor(0, 205, 230);
  doc.rect(0, 96, W, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Car Sense AI", M, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(160, 175, 195);
  doc.text("Vehicle Damage Inspection Report", M, 62);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`Report ID: ${input.reportId.slice(0, 8).toUpperCase()}`, W - M, 44, { align: "right" });
  doc.text(`Date: ${formatDate(input.createdAt)}`, W - M, 60, { align: "right" });
  y = 124;

  // vehicle block
  doc.setTextColor(20, 24, 32);
  const v = input.vehicle;
  const vehicleLine = v ? [v.brand, v.model, v.year ? `(${v.year})` : ""].filter(Boolean).join(" ") : "Vehicle not specified";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(vehicleLine, M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 115);
  const meta = [v?.nickname, v?.registration_number ? `Reg. ${v.registration_number}` : null].filter(Boolean).join("  ·  ");
  if (meta) doc.text(meta, M, y + 15);
  const method =
    input.source === "gemini" ? "Gemini vision AI" : input.source === "edited" ? "AI, reviewed by owner" : input.source === "api" ? "YOLOv8 model" : input.source === "manual" ? "Marked by owner" : "Demo inference";
  doc.text(`Assessment: ${method}`, W - M, y, { align: "right" });
  y += 32;

  // photo
  const photo = await annotatedImage(input);
  if (photo) {
    const maxW = W - 2 * M;
    const maxH = 280;
    const scale = Math.min(maxW / photo.w, maxH / photo.h);
    const pw = photo.w * scale, ph = photo.h * scale;
    doc.addImage(photo.data, "JPEG", M + (maxW - pw) / 2, y, pw, ph);
    y += ph + 18;
  }

  // summary
  if (input.summary) {
    doc.setFillColor(240, 247, 250);
    const lines = doc.splitTextToSize(input.summary, W - 2 * M - 24) as string[];
    const bh = lines.length * 13 + 18;
    doc.roundedRect(M, y, W - 2 * M, bh, 6, 6, "F");
    doc.setTextColor(30, 40, 55);
    doc.setFontSize(10);
    doc.text(lines, M + 12, y + 17);
    y += bh + 16;
  }

  // damage table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 24, 32);
  doc.text(`Detected damage (${input.detections.length})`, M, y);
  y += 10;
  const cols = [M, M + 30, M + 170, M + 330, M + 430];
  doc.setFillColor(13, 18, 32);
  doc.rect(M, y, W - 2 * M, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  ["#", "Damage", "Part", "Severity", "Confidence"].forEach((h, i) => doc.text(h, cols[i]! + 8, y + 15));
  y += 22;
  doc.setFont("helvetica", "normal");
  input.detections.forEach((d, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(246, 248, 250);
      doc.rect(M, y, W - 2 * M, 22, "F");
    }
    const [r, g, b] = SEV_RGB[d.severity] ?? [100, 100, 100];
    doc.setTextColor(30, 40, 55);
    doc.text(String(i + 1), cols[0]! + 8, y + 15);
    doc.text(damageLabel(d.class), cols[1]! + 8, y + 15);
    doc.text(humanisePart(d.part), cols[2]! + 8, y + 15);
    doc.setFillColor(r, g, b);
    doc.circle(cols[3]! + 12, y + 11.5, 3.5, "F");
    doc.text(severityLabel(d.severity), cols[3]! + 20, y + 15);
    doc.text(d.confidence < 1 ? `${Math.round(d.confidence * 100)}%` : "Owner", cols[4]! + 8, y + 15);
    y += 22;
  });
  if (!input.detections.length) {
    doc.setTextColor(90, 100, 115);
    doc.text("No visible damage detected.", M + 8, y + 15);
    y += 22;
  }
  y += 18;

  // estimate
  if (y > H - 170) {
    doc.addPage();
    y = M;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 24, 32);
  doc.text("Repair estimate", M, y);
  y += 10;
  const half = (W - 2 * M - 12) / 2;
  const boxes = [
    { title: "Authorized service center", value: range(input.estimate.showroom) },
    { title: "Local mechanic", value: range(input.estimate.local_mechanic) },
  ];
  boxes.forEach((box, i) => {
    const x = M + i * (half + 12);
    doc.setDrawColor(210, 218, 228);
    doc.setFillColor(i === 1 ? 236 : 246, i === 1 ? 250 : 248, i === 1 ? 252 : 250);
    doc.roundedRect(x, y, half, 58, 6, 6, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 100, 115);
    doc.text(box.title, x + 12, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(13, 18, 32);
    doc.text(box.value, x + 12, y + 42);
  });
  y += 78;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  const note = doc.splitTextToSize(
    "Estimates are indicative ranges based on typical Indian repair prices for the detected parts and severity. Actual quotes vary by city, parts availability and paint finish. This report is not an insurance assessment.",
    W - 2 * M,
  ) as string[];
  doc.text(note, M, y);

  // footer
  doc.setDrawColor(225, 230, 236);
  doc.line(M, H - 40, W - M, H - 40);
  doc.setFontSize(8);
  doc.text("Generated by Car Sense AI  ·  See the damage. Know the cost. Drive with confidence.", M, H - 26);
  doc.text(new Date().toLocaleString("en-IN"), W - M, H - 26, { align: "right" });

  doc.save(`CarSense-Report-${formatDate(input.createdAt).replace(/\s+/g, "-")}.pdf`);
}
