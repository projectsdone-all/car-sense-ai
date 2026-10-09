import type { DamageDetection } from "@/types";
import { damageLabel, humanisePart } from "@/lib/format";
import { SeverityBadge } from "@/components/damage/SeverityBadge";

export function DamageCard({
  detection,
  onFocus,
  active,
}: {
  detection: DamageDetection;
  onFocus?: () => void;
  active?: boolean;
}) {
  const Wrapper = onFocus ? "button" : "div";
  return (
    <Wrapper
      {...(onFocus ? { type: "button" as const, onClick: onFocus } : {})}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3 text-left shadow-card ${
        active ? "border-primary" : "border-border"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{damageLabel(detection.class)}</p>
        <p className="truncate text-xs text-muted-foreground">{humanisePart(detection.part)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">
          {Math.round(detection.confidence * 100)}%
        </span>
        <SeverityBadge severity={detection.severity} />
      </div>
    </Wrapper>
  );
}
