import { severityLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  minor: "bg-minor text-minor-foreground",
  moderate: "bg-moderate text-moderate-foreground",
  severe: "bg-severe text-severe-foreground",
};

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STYLES[severity] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {severityLabel(severity)}
    </span>
  );
}
