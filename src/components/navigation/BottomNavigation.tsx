import { Link } from "@tanstack/react-router";
import { Compass, History, Home, ScanLine, User } from "lucide-react";

const LEFT = [
  { to: "/", label: "Home", icon: Home },
  { to: "/mechanics", label: "Explore", icon: Compass },
] as const;
const RIGHT = [
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <li className="flex-1">
      <Link
        to={to}
        activeOptions={{ exact: to === "/" }}
        className="group relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        activeProps={{ className: "!text-primary" }}
      >
        <Icon className="size-5 transition-transform group-hover:-translate-y-0.5" aria-hidden />
        <span>{label}</span>
        <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary opacity-0 shadow-[0_0_10px_2px_var(--primary)] transition-opacity group-data-[status=active]:opacity-100" />
      </Link>
    </li>
  );
}

export function BottomNavigation() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "calc(0.6rem + env(safe-area-inset-bottom))" }}
    >
      <div className="app-shell">
        <ul className="glass relative flex items-stretch rounded-[1.4rem] px-2 shadow-[var(--shadow-raised)]">
          {LEFT.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          <li className="flex w-20 justify-center">
            <Link
              to="/scan"
              aria-label="Scan vehicle"
              className="bg-brand animate-glow group absolute -top-7 flex size-14 flex-col items-center justify-center rounded-2xl text-primary-foreground ring-4 ring-background transition-transform hover:scale-105"
            >
              <ScanLine className="size-6 transition-transform group-hover:rotate-90" aria-hidden />
            </Link>
            <span className="mt-auto pb-2 text-[11px] font-semibold text-primary">Scan</span>
          </li>
          {RIGHT.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </ul>
      </div>
    </nav>
  );
}
