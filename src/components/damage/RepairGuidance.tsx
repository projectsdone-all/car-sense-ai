import type { DamageDetection, RepairGuide } from "@/types";
import { damageLabel, severityLabel } from "@/lib/format";

export function RepairGuidance({
  detections,
  guides,
}: {
  detections: DamageDetection[];
  guides: RepairGuide[];
}) {
  const matched = detections
    .map((detection) =>
      guides.find(
        (guide) =>
          guide.damage_type === detection.class && guide.severity === detection.severity,
      ),
    )
    .filter((guide, index, all): guide is RepairGuide => Boolean(guide) && all.indexOf(guide) === index);

  if (matched.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground shadow-card">
        Professional inspection recommended before your next long drive.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {matched.map((guide) => (
        <article key={guide.id} className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {damageLabel(guide.damage_type)} · {severityLabel(guide.severity)}
          </p>
          <h3 className="mt-1 text-sm font-semibold">{guide.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{guide.content}</p>
          {guide.video_url ? (
            <a
              href={guide.video_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-primary underline"
            >
              Watch guidance video
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
