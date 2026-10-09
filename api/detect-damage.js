// Vercel serverless function: Gemini vision damage detection.
// GET  → { configured }            (lets the app know AI is available)
// POST { image: base64, mimeType } → { is_vehicle, summary, detections:[{class,severity,part,confidence,box_2d}] }
const PARTS = [
  "front_bumper", "rear_bumper", "front_door", "rear_door", "bonnet", "boot", "fender", "quarter_panel",
  "roof", "windshield", "rear_windshield", "side_window", "headlight", "tail_light", "side_mirror", "wheel",
];
const PROMPT = `You are an expert motor-insurance damage assessor in India.
Look at this photo and find every VISIBLE damage on the vehicle (car, SUV, bike or auto).
For each damage give:
- "class": one of "scratch", "dent", "crack", "broken_part"
- "severity": "minor" (cosmetic, polish/touch-up), "moderate" (panel repair/repaint), or "severe" (replacement or structural)
- "part": one of ${PARTS.join(", ")}
- "confidence": 0 to 1, how sure you are
- "box_2d": [ymin, xmin, ymax, xmax] tightly around the damage, normalised to 0-1000
Do not report dirt, reflections, shadows, stickers or water drops as damage. If there is no visible damage, return an empty list.
Return JSON only: {"is_vehicle": boolean, "summary": "one or two plain sentences for the owner", "detections": [...]}`;

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;
  if (req.method === "GET") return res.status(200).json({ configured: Boolean(key) });
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!key) return res.status(501).json({ error: "GEMINI_API_KEY is not set on the server." });
  const { image, mimeType = "image/jpeg" } = req.body || {};
  if (!image || typeof image !== "string") return res.status(400).json({ error: "No image received." });
  if (image.length > 5_500_000) return res.status(413).json({ error: "Photo is too large." });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: PROMPT }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: d?.error?.message || "AI service error" });
    const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    return res.status(200).json(JSON.parse(text));
  } catch (e) {
    return res.status(500).json({ error: "Damage analysis failed: " + (e?.message || e) });
  }
}
