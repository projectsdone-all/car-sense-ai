import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";

export function AppScreen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="app-shell min-h-screen border-x border-border/70 bg-background pb-24">
        <main>{children}</main>
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
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
