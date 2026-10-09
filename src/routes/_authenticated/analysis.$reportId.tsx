import { createFileRoute } from "@tanstack/react-router";
import { ReportDetail } from "@/components/damage/ReportDetail";

export const Route = createFileRoute("/_authenticated/analysis/$reportId")({
  head: () => ({
    meta: [
      { title: "Damage analysis — Car Sense AI" },
      {
        name: "description",
        content:
          "Detected vehicle damage with bounding boxes, severity, confidence and an INR repair estimate.",
      },
      { property: "og:title", content: "Damage analysis — Car Sense AI" },
      {
        property: "og:description",
        content: "Damage type, severity and estimated repair cost for your vehicle.",
      },
    ],
  }),
  component: AnalysisScreen,
});

function AnalysisScreen() {
  const { reportId } = Route.useParams();
  return <ReportDetail reportId={reportId} backTo="/" />;
}
