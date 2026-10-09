import { Car, Check } from "lucide-react";
import type { Vehicle } from "@/types";

export function VehicleCard({
  vehicle,
  selected,
  onSelect,
  action,
}: {
  vehicle: Vehicle;
  selected?: boolean;
  onSelect?: () => void;
  action?: React.ReactNode;
}) {
  const meta = [vehicle.brand, vehicle.model, vehicle.year ?? undefined]
    .filter(Boolean)
    .join(" · ");

  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Car className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{vehicle.nickname}</span>
        <span className="block truncate text-xs text-muted-foreground">{meta}</span>
        {vehicle.registration_number ? (
          <span className="mt-0.5 block truncate text-[11px] uppercase tracking-wide text-muted-foreground">
            {vehicle.registration_number}
          </span>
        ) : null}
      </span>
      {selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
      {action}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex w-full items-center gap-3 rounded-xl border bg-surface px-4 py-3 text-left shadow-card ${
          selected ? "border-primary" : "border-border"
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
      {content}
    </div>
  );
}
