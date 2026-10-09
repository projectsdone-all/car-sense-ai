import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, backTo, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        {backTo ? (
          <Link
            to={backTo}
            aria-label="Go back"
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}
