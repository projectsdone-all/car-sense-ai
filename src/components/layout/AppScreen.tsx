import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/lib/music";

/**
 * Responsive shell: phone → single column + bottom tab bar;
 * laptop/desktop (lg+) → fixed sidebar + wide content area.
 */
export function AppScreen({ children, wide = true }: { children: ReactNode; wide?: boolean }) {
  const { current } = usePlayer();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <div className={cn("mx-auto min-h-screen w-full max-w-[30rem] lg:pb-12", current ? "pb-48 lg:pb-28" : "pb-32", wide ? "lg:max-w-6xl lg:px-6" : "lg:max-w-3xl lg:px-6")}>
          <main className="animate-rise">{children}</main>
        </div>
      </div>
      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("px-4 py-4", className)}>
      {title ? (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-3 w-1 rounded-full bg-brand" aria-hidden />
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Two-column area on desktop; stacks on phones. */
export function Columns({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("lg:grid lg:grid-cols-2 lg:items-start lg:gap-2", className)}>{children}</div>;
}
