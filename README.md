# Car Sense AI

**See the damage. Know the cost. Drive with confidence.**

A mobile-first, installable web app for inspecting vehicle damage, estimating repair cost in INR, and getting roadside help.
React 19 + TypeScript, TanStack Router, Tailwind CSS v4 and shadcn/ui. **No backend server and no Supabase** — it deploys to Vercel as a static app plus one small AI function.

## Features
- **Damage inspection** — take or upload a photo; AI finds scratches, dents, cracks and broken parts, draws boxes on the photo, and rates severity, affected part and confidence.
- **Repair estimate** — INR range for an authorized service center and a local mechanic.
- **Repair guidance**, **history** (with share and delete), **mechanics** sorted by distance from you, **parking** spot saver, **SOS** location sharing, **service reminders** and tips, **garage** management.
- Accounts: sign up / sign in, or tap **Try the demo account** (`demo@carsense.app` / `demo1234`).

## Damage detection engines (picked automatically)
1. **Gemini vision AI** via `api/detect-damage.js` when `GEMINI_API_KEY` is set in Vercel — every visitor gets real AI.
2. **Gemini with the user's own key**, pasted on the Profile screen (kept in that browser).
3. **Your YOLOv8 service** if `VITE_AI_API_URL` is set.
4. **Demo inference** — simulated and clearly labelled, so the app always works.

## Where data lives
Accounts, vehicles, reports, reminders and parking spots are stored in the visitor's own browser (localStorage), photos in IndexedDB. Nothing needs a database. Each browser has its own data.

## Run locally
```bash
npm install
npm run dev        # http://localhost:8080
```

## Deploy on Vercel
1. Push this folder to GitHub and import it in Vercel (framework: Vite, detected automatically).
2. Add `GEMINI_API_KEY` under Settings → Environment Variables (optional but recommended).
3. Deploy.

## Notes
- Repair estimates are indicative ranges, not workshop quotes.
- Workshop listings are curated demo data; distances use your real location.
- SOS prepares and shares a location link — it does not call emergency services.
