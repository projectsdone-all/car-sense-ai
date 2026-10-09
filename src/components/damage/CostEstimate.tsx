import type { RepairEstimate } from "@/types";
import { formatRange } from "@/lib/format";

export function CostEstimate({ estimate }: { estimate: RepairEstimate }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-card">
      <dl className="divide-y divide-border">
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Authorized service center</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {formatRange(estimate.showroom.min, estimate.showroom.max)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Local mechanic</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {formatRange(estimate.local_mechanic.min, estimate.local_mechanic.max)}
          </dd>
        </div>
      </dl>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Estimated costs only. Actual repair prices may vary by city, parts availability and paint
        finish.
      </p>
    </div>
  );
}
