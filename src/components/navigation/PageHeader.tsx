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
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl lg:static lg:mb-2 lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
      <div className="flex items-center gap-3 px-4 py-3.5 lg:pb-2 lg:pt-8">
        {backTo ? (
          <Link
            to={backTo}
            aria-label="Go back"
            className="glass inline-flex size-10 items-center lg:hidden justify-center rounded-xl text-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold lg:text-3xl lg:font-bold">{title}</h1>
          {description ? (
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground lg:mt-1 lg:text-sm">
              <span className="inline-block size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}
