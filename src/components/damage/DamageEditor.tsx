import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAMAGE_LABELS, SEVERITY_LABELS, damageLabel, humanisePart } from "@/lib/format";
import { PARTS } from "@/services/ai/damageDetectionService";
import type { DamageDetection, DamageType, Severity } from "@/types";

interface Props {
  src: string;
  /** Natural size of the image the boxes are measured against */
  width: number;
  height: number;
  initial: DamageDetection[];
  saving?: boolean;
  saveLabel?: string;
  onSave: (detections: DamageDetection[]) => void;
  onCancel?: () => void;
}

type Draft = { x0: number; y0: number; x1: number; y1: number } | null;

const SELECT =
  "min-h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

/**
 * Draw a box over each damaged area, then say what it is.
 * Used to mark damage by hand (no AI key) and to correct what the AI found.
 */
export function DamageEditor({ src, width, height, initial, saving, saveLabel = "Save", onSave, onCancel }: Props) {
  const [items, setItems] = useState<DamageDetection[]>(initial.map((d) => ({ ...d, bbox: { ...d.bbox } })));
  const [selected, setSelected] = useState<number | null>(initial.length ? 0 : null);
  const [draft, setDraft] = useState<Draft>(null);
  const area = useRef<HTMLDivElement>(null);

  const toPoint = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  function down(e: React.PointerEvent) {
    if ((e.target as HTMLElement).dataset["box"]) return;
    const p = toPoint(e);
    area.current!.setPointerCapture(e.pointerId);
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  }
  function move(e: React.PointerEvent) {
    if (!draft) return;
    const p = toPoint(e);
    setDraft({ ...draft, x1: p.x, y1: p.y });
  }
  function up() {
    if (!draft) return;
    const x = Math.min(draft.x0, draft.x1), y = Math.min(draft.y0, draft.y1);
    const w = Math.abs(draft.x1 - draft.x0), h = Math.abs(draft.y1 - draft.y0);
    setDraft(null);
    if (w < 0.03 || h < 0.03) return; // a tap, not a box
    const next: DamageDetection = {
      class: "dent",
      severity: "moderate",
      part: "front_bumper",
      confidence: 1,
      bbox: { x: x * width, y: y * height, width: w * width, height: h * height },
    };
    setItems((list) => [...list, next]);
    setSelected(items.length);
  }

  const update = (i: number, patch: Partial<DamageDetection>) =>
    setItems((list) => list.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  const remove = (i: number) => {
    setItems((list) => list.filter((_, k) => k !== i));
    setSelected(null);
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const cur = selected !== null ? items[selected] : undefined;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Drag on the photo to draw a box around each damaged area, then choose what it is. Tap a box to change it.
      </p>

      <div
        ref={area}
        className="relative touch-none select-none overflow-hidden rounded-xl border border-border bg-muted"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => setDraft(null)}
        data-testid="damage-editor"
      >
        <img src={src} alt="Vehicle photo" className="pointer-events-none block w-full" draggable={false} />
        {items.map((d, i) => (
          <button
            key={i}
            type="button"
            data-box="1"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setSelected(i)}
            className="absolute rounded-[3px] border-2"
            style={{
              left: pct(d.bbox.x, width),
              top: pct(d.bbox.y, height),
              width: pct(d.bbox.width, width),
              height: pct(d.bbox.height, height),
              borderColor: "var(--primary)",
              background: selected === i ? "color-mix(in oklch, var(--primary) 18%, transparent)" : "transparent",
              boxShadow: "0 0 0 1px oklch(1 0 0 / 0.6)",
            }}
            aria-label={`Damage ${i + 1}: ${damageLabel(d.class)}`}
          >
            <span
              data-box="1"
              className="absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded-t-[3px] px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {i + 1}. {damageLabel(d.class)}
            </span>
          </button>
        ))}
        {draft ? (
          <span
            className="pointer-events-none absolute rounded-[3px] border-2 border-dashed"
            style={{
              left: `${Math.min(draft.x0, draft.x1) * 100}%`,
              top: `${Math.min(draft.y0, draft.y1) * 100}%`,
              width: `${Math.abs(draft.x1 - draft.x0) * 100}%`,
              height: `${Math.abs(draft.y1 - draft.y0) * 100}%`,
              borderColor: "var(--primary)",
            }}
          />
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          <Plus className="size-4" aria-hidden /> No damage marked yet — drag on the photo to add one.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((d, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                  selected === i ? "border-primary bg-surface" : "border-border bg-surface"
                }`}
              >
                <span>
                  <b>{i + 1}.</b> {damageLabel(d.class)} · {humanisePart(d.part)}
                </span>
                <span className="text-xs text-muted-foreground">{SEVERITY_LABELS[d.severity]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {cur && selected !== null ? (
        <div className="space-y-3 rounded-xl border border-primary/40 bg-surface p-3" data-testid="damage-form">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Damage {selected + 1}</p>
            <button type="button" onClick={() => remove(selected)} className="flex items-center gap-1 text-xs text-destructive">
              <Trash2 className="size-3.5" aria-hidden /> Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs font-medium">
              Type
              <select className={SELECT} value={cur.class} onChange={(e) => update(selected, { class: e.target.value as DamageType })} aria-label="Damage type">
                {(Object.keys(DAMAGE_LABELS) as DamageType[]).map((t) => (
                  <option key={t} value={t}>{DAMAGE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium">
              Part
              <select className={SELECT} value={cur.part} onChange={(e) => update(selected, { part: e.target.value })} aria-label="Damaged part">
                {(PARTS.includes(cur.part as (typeof PARTS)[number]) ? PARTS : [cur.part, ...PARTS]).map((p) => (
                  <option key={p} value={p}>{humanisePart(p)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="space-y-1 text-xs font-medium">
            Severity
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Severity">
              {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={cur.severity === s}
                  onClick={() => update(selected, { severity: s })}
                  className={`min-h-10 rounded-lg border text-sm ${cur.severity === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                >
                  {SEVERITY_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" className="min-h-12 flex-1" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" className="min-h-12 flex-[1.4] text-base" onClick={() => onSave(items.map((d) => ({ ...d, confidence: d.confidence ?? 1 })))} disabled={saving}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
