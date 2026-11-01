import { BrainCircuit, IndianRupee, MapPinned, ScanLine, ShieldCheck, Siren } from "lucide-react";

const DEMO_URL = "car-sense-ai-rust.vercel.app";
const QR_PATH =
  "M0 0.5h7m3 0h1m1 0h2m1 0h1m3 0h2m1 0h7M0 1.5h1m5 0h1m3 0h2m1 0h3m6 0h1m5 0h1M0 2.5h1m1 0h3m1 0h1m1 0h1m2 0h3m1 0h1m3 0h1m2 0h1m1 0h3m1 0h1M0 3.5h1m1 0h3m1 0h1m1 0h1m2 0h2m1 0h4m2 0h1m1 0h1m1 0h3m1 0h1M0 4.5h1m1 0h3m1 0h1m1 0h5m3 0h1m2 0h2m1 0h1m1 0h3m1 0h1M0 5.5h1m5 0h1m1 0h1m6 0h1m1 0h2m1 0h1m1 0h1m5 0h1M0 6.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M8 7.5h2m4 0h2m4 0h1M0 8.5h1m1 0h5m2 0h2m4 0h3m1 0h1m2 0h5M0 9.5h4m6 0h1m1 0h3m1 0h1m2 0h1m2 0h3m3 0h1M0 10.5h2m2 0h4m1 0h1m1 0h1m1 0h4m3 0h2m1 0h2M0 11.5h1m1 0h1m2 0h1m1 0h1m1 0h1m2 0h2m1 0h1m2 0h1m3 0h2m1 0h1m1 0h1M0 12.5h1m4 0h3m1 0h2m1 0h1m1 0h2m1 0h3m5 0h2M0 13.5h1m1 0h1m2 0h1m5 0h1m4 0h7m1 0h1m3 0h1M1 14.5h1m1 0h5m1 0h2m4 0h1m1 0h1m2 0h1m4 0h2M3 15.5h2m2 0h1m1 0h2m3 0h1m1 0h1m1 0h1m5 0h1m2 0h1M0 16.5h1m1 0h1m3 0h3m1 0h1m1 0h1m4 0h1m5 0h1m1 0h2M0 17.5h1m1 0h4m1 0h3m3 0h2m4 0h6m1 0h1m1 0h1M0 18.5h1m3 0h4m1 0h3m1 0h3m1 0h1m2 0h1m1 0h3m1 0h1M0 19.5h1m1 0h2m1 0h1m2 0h3m1 0h2m1 0h2m1 0h1m1 0h3m1 0h1m2 0h1M0 20.5h1m5 0h1m1 0h3m3 0h1m2 0h1m1 0h6m1 0h3M8 21.5h5m3 0h1m1 0h1m1 0h1m3 0h5M0 22.5h7m2 0h2m4 0h2m2 0h2m1 0h1m1 0h3M0 23.5h1m5 0h1m1 0h2m2 0h1m1 0h3m3 0h1m3 0h1m2 0h1M0 24.5h1m1 0h3m1 0h1m1 0h5m2 0h1m1 0h1m2 0h5m1 0h1M0 25.5h1m1 0h3m1 0h1m1 0h1m2 0h1m2 0h1m1 0h1m2 0h1m5 0h4M0 26.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h8m2 0h6M0 27.5h1m5 0h1m3 0h1m1 0h2m4 0h1m1 0h2m1 0h1m1 0h1m1 0h1M0 28.5h7m1 0h4m1 0h3m1 0h1m1 0h1m2 0h1m1 0h1m1 0h1";

const FEATURES = [
  { icon: BrainCircuit, title: "AI damage detection", text: "Finds dents, scratches, cracks and broken parts in one photo." },
  { icon: IndianRupee, title: "Instant INR estimate", text: "Service-center vs local-mechanic repair cost ranges." },
  { icon: MapPinned, title: "Help nearby", text: "Workshops sorted by distance, parking saver and SOS sharing." },
];

const STEPS = [
  { n: "01", title: "Snap", text: "Take or upload a photo of the damaged area." },
  { n: "02", title: "Detect", text: "Gemini vision marks every damaged part with a box." },
  { n: "03", title: "Review", text: "Fix the type, part or severity — or draw a missed box." },
  { n: "04", title: "Act", text: "Get the estimate, repair guide and the nearest workshop." },
];

/** Presentation panels shown beside the phone-sized app on large screens (open-day / laptop demos). */
export function Showcase() {
  return (
    <>
      <aside
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-0 z-0 hidden w-[calc(50vw-15rem)] items-center justify-center px-10 min-[1180px]:flex"
      >
        <div className="pointer-events-auto w-full max-w-md">
          <div className="flex items-center gap-3">
            <span className="bg-brand flex size-12 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-glow)]">
              <ScanLine className="size-6" />
            </span>
            <div>
              <p className="font-display text-xl font-bold tracking-tight">Car Sense AI</p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vehicle damage intelligence</p>
            </div>
          </div>
          <h2 className="mt-10 text-5xl font-bold leading-[1.05]">
            See the damage.
            <br />
            <span className="text-gradient">Know the cost.</span>
            <br />
            Drive with confidence.
          </h2>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="glass flex size-11 shrink-0 items-center justify-center rounded-xl text-primary">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <aside
        aria-hidden
        className="pointer-events-none fixed inset-y-0 right-0 z-0 hidden w-[calc(50vw-15rem)] items-center justify-center px-10 min-[1180px]:flex"
      >
        <div className="pointer-events-auto w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
          <ol className="relative mt-6 space-y-6 before:absolute before:bottom-4 before:left-[1.35rem] before:top-4 before:w-px before:bg-gradient-to-b before:from-primary/70 before:to-transparent">
            {STEPS.map((step) => (
              <li key={step.n} className="relative flex gap-4">
                <span className="glass font-display relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary">
                  {step.n}
                </span>
                <span className="pt-1">
                  <span className="font-display block text-lg font-semibold">{step.title}</span>
                  <span className="block text-sm text-muted-foreground">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="glass mt-10 flex items-center gap-5 rounded-3xl p-5">
            <div className="rounded-2xl bg-white p-2.5 shadow-[var(--shadow-glow)]">
              <svg viewBox="0 0 29 29" className="size-28" shapeRendering="crispEdges" role="img" aria-label={"QR code for " + DEMO_URL}>
                <path stroke="#0d1220" d={QR_PATH} />
              </svg>
            </div>
            <div>
              <p className="font-display text-lg font-semibold leading-tight">Try it on your phone</p>
              <p className="mt-1 text-sm text-muted-foreground">Scan the code — installs like an app.</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                <ShieldCheck className="size-3.5" /> No sign-up needed
              </p>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Siren className="size-3.5 text-hot" /> {DEMO_URL}
          </p>
        </div>
      </aside>
    </>
  );
}
