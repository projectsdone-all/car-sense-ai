import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Cpu,
  FileSearch,
  Lightbulb,
  MapPin,
  ScanLine,
  Siren,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { EmptyState, ErrorState, SkeletonList } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import {
  fetchReminders,
  fetchReports,
  fetchTips,
  fetchVehicles,
  readSelectedVehicleId,
  writeSelectedVehicleId,
} from "@/lib/queries";
import { formatDate, formatRange, greeting } from "@/lib/format";
import { VehiclePicker } from "@/components/vehicle/VehiclePicker";
import { CarScan } from "@/components/common/CarScan";
import { getInferenceMode } from "@/services/ai/damageDetectionService";
import { useAuth } from "@/hooks/use-auth";
import { fetchHealthScore } from "@/lib/health";
import { HealthRing, healthColor } from "@/components/common/HealthRing";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Car Sense AI — Vehicle damage scanner & repair estimates" },
      {
        name: "description",
        content:
          "Scan your car with your phone camera to identify dents, scratches and cracks, get an INR repair estimate and find a nearby mechanic.",
      },
      { property: "og:title", content: "Car Sense AI — Vehicle damage scanner" },
      {
        property: "og:description",
        content: "See the damage. Know the cost. Drive with confidence.",
      },
    ],
  }),
  component: HomeScreen,
});

const QUICK_ACTIONS = [
  { to: "/parking", label: "Parking", icon: MapPin, tint: "oklch(0.78 0.14 200)" },
  { to: "/mechanics", label: "Mechanics", icon: Wrench, tint: "oklch(0.74 0.15 290)" },
  { to: "/sos", label: "SOS", icon: Siren, tint: "oklch(0.7 0.2 28)" },
  { to: "/service", label: "Service", icon: CircleAlert, tint: "oklch(0.84 0.14 85)" },
] as const;

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const ms = new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

function HomeScreen() {
  const { user } = useAuth();
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
  const reports = useQuery({ queryKey: ["reports", "recent"], queryFn: () => fetchReports(3) });
  const allReports = useQuery({ queryKey: ["reports", "all"], queryFn: () => fetchReports() });
  const tips = useQuery({ queryKey: ["tips"], queryFn: fetchTips });
  const reminders = useQuery({ queryKey: ["reminders"], queryFn: fetchReminders });
  const mode = useQuery({ queryKey: ["inference-mode"], queryFn: getInferenceMode });
  const aiOn = mode.data !== undefined && mode.data !== "demo";

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const stored = readSelectedVehicleId();
    const list = vehicles.data ?? [];
    if (list.length === 0) return;
    const valid = stored && list.some((vehicle) => vehicle.id === stored) ? stored : list[0]!.id;
    setSelectedId(valid);
    writeSelectedVehicleId(valid);
  }, [vehicles.data]);

  const health = useQuery({
    queryKey: ["health", selectedId, allReports.dataUpdatedAt, reminders.dataUpdatedAt],
    queryFn: () => fetchHealthScore(selectedId),
    enabled: !vehicles.isLoading,
  });

  const tip = tips.data?.[new Date().getDate() % Math.max(tips.data.length, 1)];
  const nextReminder = reminders.data?.find((reminder) => !reminder.completed);
  const dueIn = daysUntil(nextReminder?.due_date);
  const firstName = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "driver").split(" ")[0];

  const stats = [
    { label: "Vehicles", value: vehicles.data?.length ?? "–" },
    { label: "Inspections", value: allReports.data?.length ?? "–" },
    { label: "Next service", value: dueIn === null ? "—" : dueIn <= 0 ? "Due" : `${dueIn}d` },
  ];

  return (
    <AppScreen>
      <header className="flex items-center justify-between px-4 pb-2 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="bg-brand flex size-10 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]">
            <ScanLine className="size-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="font-display block text-base font-bold tracking-tight">Car Sense AI</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Damage intelligence</span>
          </span>
        </div>
        <Link
          to="/profile"
          aria-label="Open profile"
          className="glass inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-primary"
        >
          <User className="size-5" aria-hidden />
        </Link>
      </header>

      <div className="px-4 pt-4">
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="mt-0.5 text-[1.9rem] font-bold capitalize leading-tight">
          <span className="text-gradient">{firstName}</span>
        </h1>
      </div>

      {/* Hero scanner */}
      <div className="px-4 pt-5">
        <div className="hud-corners relative overflow-hidden rounded-3xl border border-primary/25 bg-[linear-gradient(160deg,oklch(0.27_0.06_230/0.85),oklch(0.17_0.03_258/0.9))] p-5 shadow-[var(--shadow-raised)]">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <span
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold " +
                  (aiOn
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-[oklch(0.84_0.14_85/0.4)] bg-[oklch(0.84_0.14_85/0.1)] text-[oklch(0.88_0.13_85)]")
                }
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                </span>
                {mode.isLoading ? "Checking AI…" : aiOn ? "AI vision online" : "Manual marking mode"}
              </span>
              <h2 className="mt-3 text-2xl font-bold leading-tight">
                Scan. Detect.
                <br />
                Estimate in seconds.
              </h2>
            </div>
            <Cpu className="size-6 shrink-0 text-primary/70" aria-hidden />
          </div>

          <CarScan className="-mx-2 mt-3" />

          <Button asChild className="mt-4 min-h-13 w-full text-base">
            <Link to="/scan">
              <ScanLine className="size-5" aria-hidden />
              Start damage scan
              <ArrowUpRight className="ml-auto size-5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {/* Health + stats */}
      <div className="px-4 pt-3">
        <Link
          to="/service"
          className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4 backdrop-blur-xl transition-colors hover:border-primary/40"
        >
          <HealthRing health={health.data} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Car health</p>
            <p className="font-display text-xl font-bold" style={health.data ? { color: healthColor(health.data.tone) } : undefined}>
              {health.data?.label ?? "Calculating…"}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {(health.data?.factors ?? []).map((factor) => (
                <li key={factor} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        </Link>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-surface px-3 py-2.5 backdrop-blur-xl">
              <p className="font-display text-xl font-bold">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5">
        <VehiclePicker
          vehicles={vehicles.data ?? []}
          loading={vehicles.isLoading}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            writeSelectedVehicleId(id);
          }}
        />
      </div>

      <Section title="Quick actions">
        <ul className="grid grid-cols-4 gap-2.5">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon, tint }) => (
            <li key={to}>
              <Link
                to={to}
                className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-xs font-semibold backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[var(--tint)]"
                style={{ ["--tint" as string]: tint }}
              >
                <span
                  className="flex size-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                  style={{ background: `color-mix(in oklch, ${tint} 16%, transparent)`, color: tint, boxShadow: `0 0 24px -6px ${tint}` }}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Recent inspections"
        action={
          <Link to="/history" className="text-xs font-semibold text-primary">
            View all →
          </Link>
        }
      >
        {reports.isLoading ? (
          <SkeletonList rows={2} />
        ) : reports.isError ? (
          <ErrorState message="Inspections could not be loaded." onRetry={() => reports.refetch()} />
        ) : (reports.data ?? []).length === 0 ? (
          <EmptyState
            icon={<FileSearch className="size-7 text-primary" aria-hidden />}
            title="No inspections yet"
            description="Run your first scan — the report lands here with photos, damage and cost."
            action={
              <Button asChild className="min-h-11">
                <Link to="/scan">
                  <Sparkles className="size-4" aria-hidden /> Scan your car
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {(reports.data ?? []).map((report) => (
              <li key={report.id}>
                <Link
                  to="/history/$reportId"
                  params={{ reportId: report.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 backdrop-blur-xl transition-colors hover:border-primary/40"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <FileSearch className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">Inspection · {formatDate(report.created_at)}</span>
                    <span className="font-display block truncate text-sm text-primary">
                      {report.min_cost && report.max_cost ? formatRange(report.min_cost, report.max_cost) : "Estimate unavailable"}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {tip ? (
        <Section title="Vehicle health tip">
          <div className="relative overflow-hidden rounded-2xl border border-[oklch(0.84_0.14_85/0.25)] bg-[linear-gradient(135deg,oklch(0.84_0.14_85/0.12),transparent_60%)] px-4 py-4">
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.84_0.14_85/0.15)] text-[oklch(0.88_0.13_85)]">
                <Lightbulb className="size-4.5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">{tip.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tip.content}</p>
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Upcoming service">
        {nextReminder ? (
          <Link
            to="/service"
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 backdrop-blur-xl transition-colors hover:border-primary/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <CalendarClock className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold capitalize">{nextReminder.service_type.replace(/_/g, " ")}</span>
              <span className="block text-xs text-muted-foreground">
                {nextReminder.due_date ? `Due ${formatDate(nextReminder.due_date)}` : "No date set"}
              </span>
            </span>
            {dueIn !== null ? (
              <span className="font-display rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                {dueIn <= 0 ? "Due now" : `in ${dueIn} days`}
              </span>
            ) : null}
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        ) : (
          <EmptyState
            icon={<CalendarClock className="size-7 text-primary" aria-hidden />}
            title="No service reminders yet"
            description="Add oil changes, insurance renewals and inspections so nothing slips."
            action={
              <Button asChild variant="outline" className="min-h-11">
                <Link to="/service">Add reminder</Link>
              </Button>
            }
          />
        )}
      </Section>
    </AppScreen>
  );
}
