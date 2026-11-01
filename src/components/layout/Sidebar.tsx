import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  CircleAlert,
  History,
  LayoutDashboard,
  MapPin,
  Music2,
  ScanLine,
  Siren,
  User,
  Wrench,
} from "lucide-react";
import { getInferenceMode, MODE_LABEL } from "@/services/ai/damageDetectionService";
import { useAuth } from "@/hooks/use-auth";
import { QrCode } from "@/components/layout/QrCode";

const GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/scan", label: "Scan vehicle", icon: ScanLine },
      { to: "/history", label: "Inspections", icon: History },
    ],
  },
  {
    label: "Car care",
    items: [
      { to: "/mechanics", label: "Mechanics", icon: Wrench },
      { to: "/service", label: "Service", icon: CircleAlert },
      { to: "/parking", label: "Parking", icon: MapPin },
      { to: "/vehicles", label: "My garage", icon: Car },
    ],
  },
  {
    label: "On the road",
    items: [{ to: "/music", label: "Drive music", icon: Music2 }],
  },
] as const;

const linkBase =
  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground";

export function Sidebar() {
  const { user } = useAuth();
  const mode = useQuery({ queryKey: ["inference-mode"], queryFn: getInferenceMode });
  const aiOn = mode.data !== undefined && mode.data !== "demo";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-[oklch(0.13_0.018_258/0.85)] backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <span className="bg-brand flex size-10 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]">
          <ScanLine className="size-5" aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="font-display block text-base font-bold tracking-tight">Car Sense AI</span>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Damage intelligence</span>
        </span>
      </div>

      <div className="px-4">
        <Link to="/scan" className="bg-brand flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110">
          <ScanLine className="size-4" aria-hidden /> New scan
        </Link>
      </div>

      <nav aria-label="Primary" className="mt-6 flex-1 space-y-6 overflow-y-auto px-3">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    activeOptions={{ exact: to === "/" }}
                    className={linkBase}
                    activeProps={{ className: "!bg-primary/12 !text-primary shadow-[inset_2px_0_0_var(--primary)]" }}
                  >
                    <Icon className="size-[18px]" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">Emergency</p>
          <Link
            to="/sos"
            className="flex items-center gap-3 rounded-xl border border-[oklch(0.64_0.21_25/0.35)] bg-[oklch(0.64_0.21_25/0.1)] px-3 py-2.5 text-sm font-semibold text-[oklch(0.78_0.16_28)] transition-colors hover:bg-[oklch(0.64_0.21_25/0.2)]"
            activeProps={{ className: "!bg-[oklch(0.64_0.21_25/0.25)]" }}
          >
            <Siren className="size-[18px]" aria-hidden /> SOS roadside help
          </Link>
        </div>
      </nav>

      <div className="space-y-3 p-4">
        <div className="hidden items-center gap-3 rounded-2xl border border-border bg-surface p-3 [@media(min-height:940px)]:flex">
          <div className="rounded-lg bg-white p-1.5">
            <QrCode className="size-14" />
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            <span className="block font-semibold text-foreground">Open on your phone</span>
            Scan to try it on mobile
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl px-1 text-[11px] text-muted-foreground">
          <span className={"size-2 rounded-full " + (aiOn ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-[oklch(0.84_0.14_85)]")} />
          {mode.data ? MODE_LABEL[mode.data] : "Checking AI…"}
        </div>
        <Link to="/profile" className={linkBase + " border border-border"} activeProps={{ className: "!text-primary !border-primary/40" }}>
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary">
            <User className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-foreground">{user?.user_metadata?.full_name || "Profile"}</span>
            <span className="block truncate text-[11px]">{user?.email}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
