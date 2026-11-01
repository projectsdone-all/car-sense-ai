import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { Showcase } from "@/components/layout/Showcase";

export function AppScreen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Showcase />
      <div className="app-shell relative min-h-screen pb-32 min-[1180px]:my-6 min-[1180px]:min-h-[calc(100vh-3rem)] min-[1180px]:rounded-[2rem] min-[1180px]:border min-[1180px]:border-border min-[1180px]:bg-background/40 min-[1180px]:shadow-[0_40px_120px_-30px_oklch(0_0_0/0.8)]">
        <main className="animate-rise">{children}</main>
      </div>
      <BottomNavigation />
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="px-4 py-4">
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
