import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  CircleAlert,
  Lightbulb,
  MapPin,
  ScanLine,
  Siren,
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
  { to: "/parking", label: "Parking", icon: MapPin },
  { to: "/mechanics", label: "Mechanics", icon: Wrench },
  { to: "/sos", label: "SOS", icon: Siren },
  { to: "/service", label: "Service", icon: CircleAlert },
] as const;

function HomeScreen() {
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
  const reports = useQuery({ queryKey: ["reports", "recent"], queryFn: () => fetchReports(3) });
  const tips = useQuery({ queryKey: ["tips"], queryFn: fetchTips });
  const reminders = useQuery({ queryKey: ["reminders"], queryFn: fetchReminders });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const stored = readSelectedVehicleId();
    const list = vehicles.data ?? [];
    if (list.length === 0) return;
    const valid = stored && list.some((vehicle) => vehicle.id === stored) ? stored : list[0]!.id;
    setSelectedId(valid);
    writeSelectedVehicleId(valid);
  }, [vehicles.data]);

  const tip = tips.data?.[new Date().getDate() % Math.max(tips.data.length, 1)];
  const nextReminder = reminders.data?.find((reminder) => !reminder.completed);

  return (
    <AppScreen>
      <header className="flex items-center justify-between px-4 pb-2 pt-5">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="size-5" aria-hidden />
          </span>
          <span className="text-base font-semibold">Car Sense AI</span>
        </div>
        <Link
          to="/profile"
          aria-label="Open profile"
          className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground"
        >
          <User className="size-5" aria-hidden />
        </Link>
      </header>

      <div className="px-4 pt-3">
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <div className="mt-3">
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
      </div>

      <div className="px-4 pt-5">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h2 className="text-lg font-semibold tracking-tight">Check your vehicle</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a photo and identify visible damage.
          </p>
          <Button asChild className="mt-4 min-h-12 w-full text-base">
            <Link to="/scan">
              <ScanLine className="size-5" aria-hidden />
              Scan Vehicle
            </Link>
          </Button>
        </div>
      </div>

      <Section title="Quick actions">
        <ul className="grid grid-cols-4 gap-2">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface text-xs font-medium shadow-card"
              >
                <Icon className="size-5 text-primary" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Recent inspections"
        action={
          <Link to="/history" className="text-xs font-medium text-primary">
            View all
          </Link>
        }
      >
        {reports.isLoading ? (
          <SkeletonList rows={2} />
        ) : reports.isError ? (
          <ErrorState message="Inspections could not be loaded." onRetry={() => reports.refetch()} />
        ) : (reports.data ?? []).length === 0 ? (
          <EmptyState
            title="No inspections yet."
            description="Scan your vehicle to create your first inspection."
            action={
              <Button asChild className="min-h-11">
                <Link to="/scan">Scan Vehicle</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            {(reports.data ?? []).map((report) => (
              <li key={report.id}>
                <Link
                  to="/history/$reportId"
                  params={{ reportId: report.id }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      Inspection · {formatDate(report.created_at)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {report.min_cost && report.max_cost
                        ? formatRange(report.min_cost, report.max_cost)
                        : "Estimate unavailable"}
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
          <div className="flex gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-medium">{tip.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tip.content}</p>
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Upcoming service">
        {nextReminder ? (
          <Link
            to="/service"
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
          >
            <span>
              <span className="block text-sm font-medium capitalize">
                {nextReminder.service_type.replace(/_/g, " ")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {nextReminder.due_date ? `Due ${formatDate(nextReminder.due_date)}` : "No date set"}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        ) : (
          <EmptyState
            title="No service reminders yet."
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
