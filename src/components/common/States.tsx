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
    <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center">
      {icon ? <div className="mb-3 flex justify-center text-muted-foreground">{icon}</div> : null}
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-8 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-xl" />
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
      className="rounded-xl border border-border bg-surface px-4 py-5 text-center shadow-card"
    >
      <AlertTriangle className="mx-auto mb-2 size-5 text-destructive" aria-hidden />
      <p className="text-sm text-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
