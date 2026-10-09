import { Link } from "@tanstack/react-router";
import { Camera, Compass, History, Home, User } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/scan", label: "Scan", icon: Camera },
  { to: "/mechanics", label: "Explore", icon: Compass },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNavigation() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="app-shell flex items-stretch justify-between px-2">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex min-h-11 flex-col items-center gap-1 rounded-md py-2 text-[11px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" aria-hidden />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
