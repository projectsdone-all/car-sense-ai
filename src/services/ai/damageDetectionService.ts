import type { DamageType, DetectionResult, Severity } from "@/types";
import { compressImage } from "@/lib/image";

/**
 * Damage detection — one function the UI calls: detectDamage(file).
 *
 * Engines, tried in this order:
 *  1. Your own YOLOv8 service, if VITE_AI_API_URL is set (POST /api/detect-damage, multipart "image").
 *  2. Gemini vision through this site's Vercel function /api/detect-damage (GEMINI_API_KEY on Vercel).
 *  3. Gemini vision with a key the user saved on the Profile screen (kept in this browser only).
 *  4. Demo inference — clearly labelled simulated results, so the app always works.
 */
const API_URL = import.meta.env["VITE_AI_API_URL"] as string | undefined;
const KEY_STORE = "carsense.geminiKey";
const MODEL = "gemini-2.5-flash";

export type InferenceMode = "yolo" | "server" | "browser-key" | "demo";

export function getUserGeminiKey(): string {
  try { return localStorage.getItem(KEY_STORE) ?? ""; } catch { return ""; }
}
export function setUserGeminiKey(key: string) {
  try { if (key) localStorage.setItem(KEY_STORE, key.trim()); else localStorage.removeItem(KEY_STORE); } catch { /* storage blocked */ }
  serverProbe = null;
}

let serverProbe: Promise<boolean> | null = null;
async function serverHasKey(): Promise<boolean> {
  serverProbe ??= fetch("/api/detect-damage", { method: "GET" })
    .then(async (r) => r.ok && (r.headers.get("content-type") ?? "").includes("json") && Boolean((await r.json()).configured))
    .catch(() => false);
  return serverProbe;
}

export async function getInferenceMode(): Promise<InferenceMode> {
  if (API_URL) return "yolo";
  if (await serverHasKey()) return "server";
  if (getUserGeminiKey()) return "browser-key";
  return "demo";
}

export const MODE_LABEL: Record<InferenceMode, string> = {
  yolo: "YOLOv8 API",
  server: "Gemini vision AI",
  "browser-key": "Gemini vision AI (your key)",
  demo: "Demo inference",
};

export class DamageDetectionError extends Error {}

async function readImageSize(file: Blob): Promise<{ width: number; height: number }> {
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

// ── Gemini vision ───────────────────────────────────────────────────────────
export const PARTS = [
  "front_bumper", "rear_bumper", "front_door", "rear_door", "bonnet", "boot", "fender", "quarter_panel",
  "roof", "windshield", "rear_windshield", "side_window", "headlight", "tail_light", "side_mirror", "wheel",
] as const;

export const GEMINI_PROMPT = `You are an expert motor-insurance damage assessor in India.
Look at this photo and find every VISIBLE damage on the vehicle (car, SUV, bike or auto).
For each damage give:
- "class": one of "scratch", "dent", "crack", "broken_part"
- "severity": "minor" (cosmetic, polish/touch-up), "moderate" (panel repair/repaint), or "severe" (replacement or structural)
- "part": one of ${PARTS.join(", ")}
- "confidence": 0 to 1, how sure you are
- "box_2d": [ymin, xmin, ymax, xmax] tightly around the damage, normalised to 0-1000
Do not report dirt, reflections, shadows, stickers or water drops as damage. If there is no visible damage, return an empty list.
Return JSON only: {"is_vehicle": boolean, "summary": "one or two plain sentences for the owner", "detections": [...]}`;

interface GeminiDetection { class: string; severity: string; part: string; confidence: number; box_2d: number[] }
interface GeminiPayload { is_vehicle: boolean; summary?: string; detections: GeminiDetection[] }

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

async function geminiDirect(image: string, mimeType: string, key: string): Promise<GeminiPayload> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: GEMINI_PROMPT }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new DamageDetectionError(d?.error?.message ?? `AI service responded with ${r.status}`);
  const text = ((d.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]).map((p) => p.text ?? "").join("");
  return JSON.parse(text) as GeminiPayload;
}

async function geminiServer(image: string, mimeType: string): Promise<GeminiPayload> {
  const r = await fetch("/api/detect-damage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, mimeType }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new DamageDetectionError(d?.error ?? `AI service responded with ${r.status}`);
  return d as GeminiPayload;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const TYPES: DamageType[] = ["scratch", "dent", "crack", "broken_part"];
const SEVS: Severity[] = ["minor", "moderate", "severe"];

function fromGemini(p: GeminiPayload, width: number, height: number, source: "gemini"): DetectionResult {
  if (p.is_vehicle === false) {
    throw new DamageDetectionError("This photo doesn't look like a vehicle. Take a clear photo of the damaged panel and try again.");
  }
  const detections = (p.detections ?? [])
    .filter((d) => Array.isArray(d.box_2d) && d.box_2d.length === 4)
    .map((d) => {
      const [y0, x0, y1, x1] = d.box_2d.map((v) => clamp(Number(v) || 0, 0, 1000)) as [number, number, number, number];
      return {
        class: (TYPES.includes(d.class as DamageType) ? d.class : "scratch") as DamageType,
        severity: (SEVS.includes(d.severity as Severity) ? d.severity : "moderate") as Severity,
        part: (PARTS as readonly string[]).includes(d.part) ? d.part : String(d.part || "body_panel").toLowerCase().replace(/\s+/g, "_"),
        confidence: Number(clamp(Number(d.confidence) || 0.7, 0, 1).toFixed(2)),
        bbox: {
          x: Math.round((Math.min(x0, x1) / 1000) * width),
          y: Math.round((Math.min(y0, y1) / 1000) * height),
          width: Math.max(4, Math.round((Math.abs(x1 - x0) / 1000) * width)),
          height: Math.max(4, Math.round((Math.abs(y1 - y0) / 1000) * height)),
        },
      };
    });
  return { success: true, detections, source, imageWidth: width, imageHeight: height, ...(p.summary ? { summary: p.summary } : {}) };
}

// ── demo inference ──────────────────────────────────────────────────────────
/** Deterministic pseudo-random generator so a given image always yields the same demo result. */
function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const DEMO_PARTS: Record<DamageType, string[]> = {
  dent: ["front_door", "rear_door", "bonnet", "fender", "rear_bumper"],
  scratch: ["rear_bumper", "front_door", "front_bumper", "rear_door", "bonnet"],
  crack: ["windshield", "front_bumper", "headlight", "rear_bumper"],
  broken_part: ["headlight", "tail_light", "side_mirror", "front_bumper"],
};

function mockDetect(file: File, width: number, height: number): DetectionResult {
  const random = seededRandom(file.size + file.name.length * 977 + 13);
  const count = 1 + Math.floor(random() * 2.4);
  const detections = Array.from({ length: count }, () => {
    const damageType = TYPES[Math.floor(random() * TYPES.length)]!;
    const severity = SEVS[Math.floor(random() * SEVS.length)]!;
    const parts = DEMO_PARTS[damageType];
    const part = parts[Math.floor(random() * parts.length)]!;
    const boxWidth = width * (0.16 + random() * 0.24);
    const boxHeight = height * (0.14 + random() * 0.22);
    return {
      class: damageType,
      severity,
      part,
      confidence: Number((0.74 + random() * 0.22).toFixed(2)),
      bbox: {
        x: Math.round(random() * (width - boxWidth)),
        y: Math.round(random() * (height - boxHeight)),
        width: Math.round(boxWidth),
        height: Math.round(boxHeight),
      },
    };
  });
  return { success: true, detections, source: "mock", imageWidth: width, imageHeight: height };
}

// ── YOLO backend ────────────────────────────────────────────────────────────
interface ApiResponse { success: boolean; detections: DetectionResult["detections"]; error?: string }

async function yolo(file: File, width: number, height: number): Promise<DetectionResult> {
  const form = new FormData();
  form.append("image", file);
  let payload: ApiResponse;
  try {
    const response = await fetch(`${API_URL!.replace(/\/$/, "")}/api/detect-damage`, { method: "POST", body: form });
    if (!response.ok) throw new DamageDetectionError(`Inference service responded with ${response.status}`);
    payload = (await response.json()) as ApiResponse;
  } catch (error) {
    throw new DamageDetectionError(error instanceof DamageDetectionError ? error.message : "Damage analysis is temporarily unavailable.");
  }
  if (!payload.success) throw new DamageDetectionError(payload.error ?? "Damage analysis is temporarily unavailable.");
  return { success: true, detections: payload.detections ?? [], source: "api", imageWidth: width, imageHeight: height };
}

/** The single entry point the UI uses */
export async function detectDamage(file: File): Promise<DetectionResult> {
  const mode = await getInferenceMode();
  if (mode === "yolo") {
    const { width, height } = await readImageSize(file);
    return yolo(file, width, height);
  }
  if (mode === "demo") {
    const { width, height } = await readImageSize(file);
    await new Promise((resolve) => setTimeout(resolve, 900));
    return mockDetect(file, width, height);
  }
  // Gemini: send the same compressed image we store, so boxes line up with what is shown
  const small = await compressImage(file);
  const { width, height } = await readImageSize(small);
  const image = await toBase64(small);
  const mime = small.type || "image/jpeg";
  let payload: GeminiPayload;
  try {
    payload = mode === "server" ? await geminiServer(image, mime) : await geminiDirect(image, mime, getUserGeminiKey());
  } catch (e) {
    if (e instanceof DamageDetectionError) throw e;
    throw new DamageDetectionError("The AI could not read this photo. Check your internet connection and try again.");
  }
  return fromGemini(payload, width, height, "gemini");
}
