import type { DamageDetection } from "@/types";
import { damageLabel, humanisePart } from "@/lib/format";
import { SeverityBadge } from "@/components/damage/SeverityBadge";
import { SEVERITY_COLOR } from "@/components/damage/DamageImageViewer";

export function DamageCard({
  detection,
  onFocus,
  active,
  index,
}: {
  index?: number;
  detection: DamageDetection;
  onFocus?: () => void;
  active?: boolean;
}) {
  const Wrapper = onFocus ? "button" : "div";
  return (
    <Wrapper
      {...(onFocus ? { type: "button" as const, onClick: onFocus } : {})}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-surface backdrop-blur-xl px-4 py-3 text-left shadow-card ${
        active ? "border-primary shadow-[var(--shadow-glow)]" : "border-border hover:border-primary/40"
      } transition-all`}
    >
      <span
        className="font-display flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold"
        style={{
          color: SEVERITY_COLOR[detection.severity],
          background: `color-mix(in oklch, ${SEVERITY_COLOR[detection.severity] ?? "var(--primary)"} 15%, transparent)`,
          border: `1px solid color-mix(in oklch, ${SEVERITY_COLOR[detection.severity] ?? "var(--primary)"} 40%, transparent)`,
        }}
      >
        {index !== undefined ? index + 1 : "•"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{damageLabel(detection.class)}</p>
        <p className="truncate text-xs text-muted-foreground">{humanisePart(detection.part)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {detection.confidence < 1 ? (
          <span className="font-display text-xs font-semibold tabular-nums text-primary" title="AI confidence">
            {Math.round(detection.confidence * 100)}%
          </span>
        ) : null}
        <SeverityBadge severity={detection.severity} />
      </div>
    </Wrapper>
  );
}
