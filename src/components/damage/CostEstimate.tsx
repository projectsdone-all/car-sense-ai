import { Building2, Wrench } from "lucide-react";
import type { RepairEstimate } from "@/types";
import { formatInr, formatRange } from "@/lib/format";

export function CostEstimate({ estimate }: { estimate: RepairEstimate }) {
  const showroomMid = (estimate.showroom.min + estimate.showroom.max) / 2;
  const localMid = (estimate.local_mechanic.min + estimate.local_mechanic.max) / 2;
  const saving = Math.max(0, Math.round((showroomMid - localMid) / 100) * 100);
  const max = Math.max(estimate.showroom.max, estimate.local_mechanic.max, 1);

  const rows = [
    { label: "Authorized service center", icon: Building2, range: estimate.showroom, tint: "var(--primary-2)" },
    { label: "Local mechanic", icon: Wrench, range: estimate.local_mechanic, tint: "var(--primary)" },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-[linear-gradient(160deg,oklch(0.27_0.06_230/0.7),oklch(0.17_0.03_258/0.85))] shadow-[var(--shadow-raised)]">
      <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative px-5 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Estimated repair cost</p>
        <p className="font-display text-gradient mt-1 text-[2.1rem] font-bold leading-tight tabular-nums">
          {formatRange(estimate.local_mechanic.min, estimate.showroom.max)}
        </p>
        {saving > 0 ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.32_0.07_158/0.6)] px-2.5 py-1 text-xs font-semibold text-[oklch(0.88_0.15_158)]">
            Save about {formatInr(saving)} at a local mechanic
          </p>
        ) : null}
      </div>
      <dl className="relative mt-4 space-y-4 px-5 pb-5">
        {rows.map(({ label, icon: Icon, range, tint }) => (
          <div key={label}>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="size-4" style={{ color: tint }} aria-hidden /> {label}
              </dt>
              <dd className="font-display text-sm font-bold tabular-nums">{formatRange(range.min, range.max)}</dd>
            </div>
            <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-[oklch(1_0_0/0.07)]">
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  left: `${(range.min / max) * 100}%`,
                  width: `${Math.max(((range.max - range.min) / max) * 100, 4)}%`,
                  background: tint,
                  boxShadow: `0 0 12px ${tint}`,
                }}
              />
            </div>
          </div>
        ))}
      </dl>
      <p className="relative border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Estimated costs only. Actual repair prices may vary by city, parts availability and paint finish.
      </p>
    </div>
  );
}
