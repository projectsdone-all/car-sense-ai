import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ScanLine } from "lucide-react";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { EmptyState, ErrorState, SkeletonList } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { fetchReports, fetchVehicles } from "@/lib/queries";
import { formatDate, formatRange } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/history/")({
  head: () => ({
    meta: [
      { title: "Inspection history — Car Sense AI" },
      {
        name: "description",
        content:
          "Every vehicle damage inspection you have saved, with damage type, severity, estimated repair cost and date.",
      },
      { property: "og:title", content: "Inspection history — Car Sense AI" },
      {
        property: "og:description",
        content: "Track your vehicle's damage inspections over time.",
      },
    ],
  }),
  component: HistoryScreen,
});

function HistoryScreen() {
  const reports = useQuery({ queryKey: ["reports"], queryFn: () => fetchReports() });
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });

  const vehicleName = (id: string | null) =>
    vehicles.data?.find((vehicle) => vehicle.id === id)?.nickname ?? "Unassigned vehicle";

  return (
    <AppScreen>
      <PageHeader title="History" description="Saved damage inspections" />
      <Section>
        {reports.isLoading ? (
          <SkeletonList />
        ) : reports.isError ? (
          <ErrorState message="Your history could not be loaded." onRetry={() => reports.refetch()} />
        ) : (reports.data ?? []).length === 0 ? (
          <EmptyState
            icon={<ScanLine className="size-6" aria-hidden />}
            title="No inspections yet."
            description="Scan your vehicle to create your first inspection."
            action={
              <Button asChild className="min-h-11">
                <Link to="/scan">Scan Vehicle</Link>
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
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {vehicleName(report.vehicle_id)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDate(report.created_at)} ·{" "}
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
    </AppScreen>
  );
}
