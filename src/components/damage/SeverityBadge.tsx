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
        "inline-flex items-center rounded-full border border-current/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        STYLES[severity] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {severityLabel(severity)}
    </span>
  );
}
