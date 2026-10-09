import { useState } from "react";
import type { DamageDetection } from "@/types";
import { damageLabel } from "@/lib/format";

interface Props {
  src: string;
  detections: DamageDetection[];
  /** Natural pixel size the detections were computed against. */
  imageWidth: number;
  imageHeight: number;
  activeIndex?: number | null;
  alt?: string;
}

/**
 * Renders bounding boxes as percentages of the analysed image size, so the
 * overlay stays aligned at any rendered width or aspect ratio.
 */
export function DamageImageViewer({
  src,
  detections,
  imageWidth,
  imageHeight,
  activeIndex = null,
  alt = "Vehicle photo with detected damage highlighted",
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [natural, setNatural] = useState({ width: imageWidth, height: imageHeight });

  const width = natural.width || imageWidth || 1;
  const height = natural.height || imageHeight || 1;

  return (
    <figure className="relative overflow-hidden rounded-xl border border-border bg-muted">
      <img
        src={src}
        alt={alt}
        onLoad={(event) => {
          const target = event.currentTarget;
          if (!imageWidth || !imageHeight) {
            setNatural({ width: target.naturalWidth, height: target.naturalHeight });
          }
          setLoaded(true);
        }}
        className="block w-full"
      />
      {loaded
        ? detections.map((detection, index) => {
            const isActive = activeIndex === null || activeIndex === index;
            return (
              <span
                key={detection.id ?? index}
                aria-hidden
                className="pointer-events-none absolute rounded-[3px] border-2 transition-opacity"
                style={{
                  left: `${(detection.bbox.x / width) * 100}%`,
                  top: `${(detection.bbox.y / height) * 100}%`,
                  width: `${(detection.bbox.width / width) * 100}%`,
                  height: `${(detection.bbox.height / height) * 100}%`,
                  borderColor: "var(--primary)",
                  boxShadow: "0 0 0 1px oklch(1 0 0 / 0.55)",
                  opacity: isActive ? 1 : 0.35,
                }}
              >
                <span
                  className="absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded-t-[3px] px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  {damageLabel(detection.class)} {Math.round(detection.confidence * 100)}%
                </span>
              </span>
            );
          })
        : null}
    </figure>
  );
}
