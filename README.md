# Car Sense AI

**See the damage. Know the cost. Drive with confidence.**

A mobile-first, installable web app for inspecting vehicle damage, estimating repair cost in INR, and getting roadside help.
React 19 + TypeScript, TanStack Router, Tailwind CSS v4 and shadcn/ui. **No backend server and no Supabase** — it deploys to Vercel as a static app plus one small AI function.

## Features
- **Damage inspection** — take or upload a photo; AI finds scratches, dents, cracks and broken parts, draws boxes on the photo, and rates severity, affected part and confidence.
- **Repair estimate** — INR range for an authorized service center and a local mechanic.
- **Repair guidance**, **history** (with share and delete), **mechanics** sorted by distance from you, **parking** spot saver, **SOS** location sharing, **service reminders** and tips, **garage** management.
- Accounts: sign up / sign in. The login page opens with the demo account filled in (`demo@carsense.app` / `demo1234`) — just press **Sign in**.

## Damage detection

1. **Gemini vision AI** — when `GEMINI_API_KEY` is set in Vercel (or a user pastes their own key on the Profile screen), the AI inspects the photo panel by panel and finds every damaged part: broken headlights, cracked bumpers, dents, scratches, broken mirrors and more.
2. **You check the result** — before the report is saved, the AI's boxes are shown on the photo. Change the type, part or severity, remove a wrong box, or draw a box around anything it missed.
3. **No AI key?** — you mark the damage yourself by drawing boxes on the photo. Nothing is invented: the repair estimate is calculated from the parts and severity you choose.
4. **Edit later** — every saved report has an **Edit damage** button.
5. Optional: your own YOLOv8 service via `VITE_AI_API_URL`.

## Notes
- Repair estimates are indicative ranges, not workshop quotes.
- Workshop listings are curated demo data; distances use your real location.
- SOS prepares and shares a location link — it does not call emergency services.

## Tech stack

- React 19 + TypeScript + Vite
- TanStack Router + TanStack Query
- Tailwind CSS v4 + shadcn/ui + Lucide icons
- Google Gemini vision for damage detection (via `api/detect-damage.js`)
- Installable PWA

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:8080

To check the production build:

```bash
npm run build
npm run preview
```

## Push to GitHub

1. Create an empty repository on GitHub named `car-sense-ai` (no README, no .gitignore)
2. Open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/car-sense-ai.git
git push -u origin main
```

3. For later changes:

```bash
git add .
git commit -m "Describe your change"
git push
```

## Deploy on Vercel

1. Go to https://vercel.com → **Add New → Project**
2. Import the GitHub repository
3. Framework preset: **Vite** (detected automatically) — build command `npm run build`, output folder `dist`
4. Under **Environment Variables**, add:

| Name | Value | Required |
|---|---|---|
| `GEMINI_API_KEY` | your key from https://aistudio.google.com/apikey | Recommended — real AI scans for every visitor |
| `GEMINI_MODEL` | `gemini-2.5-flash` (default) | Optional |
| `VITE_AI_API_URL` | URL of your own YOLOv8 service | Optional |

5. Click **Deploy**

Every `git push` to `main` redeploys the site automatically.

## Data storage

Accounts, vehicles, reports, reminders and parking spots are stored in the visitor's browser (localStorage); photos are stored in IndexedDB. No database is needed, and each browser has its own data.
