import { useEffect, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import type { DamageDetection } from "@/types";
import { damageLabel } from "@/lib/format";

interface Props {
  src: string;
  detections: DamageDetection[];
  /** Natural pixel size the detections were computed against. */
  imageWidth: number;
  imageHeight: number;
  activeIndex?: number | null;
  alt?: string;
}

export const SEVERITY_COLOR: Record<string, string> = {
  minor: "oklch(0.82 0.16 158)",
  moderate: "oklch(0.85 0.15 80)",
  severe: "oklch(0.68 0.21 28)",
};

/**
 * Photo with damage boxes positioned as percentages of the analysed image size.
 * A before/after handle lets you drag between the plain photo and the AI view.
 */
export function DamageImageViewer({
  src,
  detections,
  imageWidth,
  imageHeight,
  activeIndex = null,
  alt = "Vehicle photo with detected damage highlighted",
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [natural, setNatural] = useState({ width: imageWidth, height: imageHeight });
  const [reveal, setReveal] = useState(0);
  const touched = useRef(false);

  const width = natural.width || imageWidth || 1;
  const height = natural.height || imageHeight || 1;

  // intro: sweep the AI view across the photo once it loads
  useEffect(() => {
    if (!loaded || touched.current) return;
    let frame = 0;
    const start = performance.now() + 250;
    const step = (t: number) => {
      if (touched.current) return;
      const p = Math.max(0, Math.min(1, (t - start) / 1300));
      setReveal(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [loaded]);

  const showHandle = loaded && detections.length > 0;

  return (
    <figure className="relative select-none overflow-hidden rounded-3xl border border-primary/25 bg-muted shadow-[var(--shadow-raised)]">
      <img
        src={src}
        alt={alt}
        draggable={false}
        onLoad={(event) => {
          const target = event.currentTarget;
          if (!imageWidth || !imageHeight) {
            setNatural({ width: target.naturalWidth, height: target.naturalHeight });
          }
          setLoaded(true);
        }}
        className="block w-full"
      />

      {loaded ? (
        <div className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}>
          <div className="absolute inset-0 bg-[oklch(0.2_0.06_230/0.28)] bg-[linear-gradient(oklch(0.83_0.145_200/0.12)_1px,transparent_1px),linear-gradient(90deg,oklch(0.83_0.145_200/0.12)_1px,transparent_1px)] bg-[size:24px_24px]" />
          {detections.map((detection, index) => {
            const isActive = activeIndex === null || activeIndex === index;
            const color = SEVERITY_COLOR[detection.severity] ?? "var(--primary)";
            return (
              <span
                key={detection.id ?? index}
                aria-hidden
                className="absolute rounded-md border-2 transition-all duration-300"
                style={{
                  left: `${(detection.bbox.x / width) * 100}%`,
                  top: `${(detection.bbox.y / height) * 100}%`,
                  width: `${(detection.bbox.width / width) * 100}%`,
                  height: `${(detection.bbox.height / height) * 100}%`,
                  borderColor: color,
                  backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`,
                  boxShadow: activeIndex === index ? `0 0 0 3px color-mix(in oklch, ${color} 40%, transparent), 0 0 24px ${color}` : `0 0 14px -2px ${color}`,
                  opacity: isActive ? 1 : 0.3,
                }}
              >
                <span
                  className="absolute -top-px left-[-2px] -translate-y-full whitespace-nowrap rounded-t-md px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: color, color: "oklch(0.17 0.03 240)" }}
                >
                  {index + 1}. {damageLabel(detection.class)}
                  {detection.confidence < 1 ? ` · ${Math.round(detection.confidence * 100)}%` : ""}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}

      {showHandle ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${reveal}%` }}>
            <div className="absolute inset-y-0 -left-px w-[2px] bg-primary shadow-[0_0_14px_2px_var(--primary)]" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `clamp(20px, ${reveal}%, calc(100% - 20px))` }}>
            <div className="bg-brand absolute top-1/2 left-0 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-glow)] ring-2 ring-background">
              <MoveHorizontal className="size-4" aria-hidden />
            </div>
          </div>
          <span className="glass pointer-events-none absolute bottom-2.5 left-2.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold text-primary">AI view</span>
          <span className="glass pointer-events-none absolute bottom-2.5 right-2.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Photo</span>
          <input
            type="range"
            min={0}
            max={100}
            value={reveal}
            onChange={(event) => {
              touched.current = true;
              setReveal(Number(event.target.value));
            }}
            aria-label="Compare photo and AI damage view"
            className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
          />
        </>
      ) : null}
    </figure>
  );
}
