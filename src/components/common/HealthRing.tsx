import { useEffect, useState } from "react";
import type { HealthScore } from "@/lib/health";

const TONE: Record<HealthScore["tone"], string> = {
  good: "oklch(0.82 0.16 158)",
  ok: "oklch(0.83 0.145 200)",
  warn: "oklch(0.84 0.15 80)",
  bad: "oklch(0.68 0.2 28)",
};

export function HealthRing({ health, size = 108 }: { health: HealthScore | undefined; size?: number }) {
  const [shown, setShown] = useState(0);
  const target = health?.score ?? 0;

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 1100);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const r = 44;
  const c = 2 * Math.PI * r;
  const color = health ? TONE[health.tone] : "var(--muted-foreground)";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * shown) / 100}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold leading-none tabular-nums">{health ? shown : "–"}</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Health</span>
      </div>
    </div>
  );
}

export const healthColor = (tone: HealthScore["tone"]) => TONE[tone];
