import { createFileRoute } from "@tanstack/react-router";
import { ReportDetail } from "@/components/damage/ReportDetail";

export const Route = createFileRoute("/_authenticated/history/$reportId")({
  head: () => ({
    meta: [
      { title: "Inspection detail — Car Sense AI" },
      {
        name: "description",
        content:
          "Saved inspection with the original photo, detected damage, severity and repair estimate.",
      },
      { property: "og:title", content: "Inspection detail — Car Sense AI" },
      {
        property: "og:description",
        content: "Review a saved vehicle inspection and its repair estimate.",
      },
    ],
  }),
  component: HistoryDetailScreen,
});

function HistoryDetailScreen() {
  const { reportId } = Route.useParams();
  return <ReportDetail reportId={reportId} backTo="/history" />;
}
