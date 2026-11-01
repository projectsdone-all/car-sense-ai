import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/25 bg-surface px-5 py-9 text-center backdrop-blur-xl">
      <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-48 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      {icon ? (
        <div className="relative mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
          {icon}
        </div>
      ) : null}
      <p className="font-display relative text-base font-semibold">{title}</p>
      {description ? <p className="relative mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="relative mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-8 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-5 text-center backdrop-blur-xl"
    >
      <AlertTriangle className="mx-auto mb-2 size-5 text-destructive" aria-hidden />
      <p className="text-sm text-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="glass mt-4 inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium hover:text-primary"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
