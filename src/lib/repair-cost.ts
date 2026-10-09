import { db } from "@/lib/db";
import type { DamageDetection, RepairEstimate, Severity } from "@/types";

interface CostRow {
  vehicle_part: string;
  damage_type: string;
  severity: string;
  service_type: string;
  min_cost: number;
  max_cost: number;
}

const SEVERITY_MULTIPLIER: Record<Severity, number> = {
  minor: 0.6,
  moderate: 1,
  severe: 1.9,
};

/** Fallback baselines (used only when no row matches the part/damage combination). */
const BASELINE: Record<string, { showroom: [number, number]; local_mechanic: [number, number] }> = {
  scratch: { showroom: [4000, 7000], local_mechanic: [1800, 3200] },
  dent: { showroom: [9000, 14000], local_mechanic: [4500, 8000] },
  crack: { showroom: [10000, 16000], local_mechanic: [5000, 8500] },
  broken_part: { showroom: [16000, 26000], local_mechanic: [8000, 14000] },
};

export async function fetchRepairCosts(): Promise<CostRow[]> {
  const { data, error } = await db
    .from("repair_costs")
    .select("vehicle_part, damage_type, severity, service_type, min_cost, max_cost");
  if (error) throw error;
  return (data ?? []) as CostRow[];
}

function pickRow(rows: CostRow[], detection: DamageDetection, serviceType: string): CostRow | undefined {
  return (
    rows.find(
      (row) =>
        row.vehicle_part === detection.part &&
        row.damage_type === detection.class &&
        row.severity === detection.severity &&
        row.service_type === serviceType,
    ) ??
    rows.find(
      (row) =>
        row.vehicle_part === detection.part &&
        row.damage_type === detection.class &&
        row.service_type === serviceType,
    ) ??
    rows.find((row) => row.damage_type === detection.class && row.service_type === serviceType)
  );
}

export function estimateRepairCost(
  detections: DamageDetection[],
  rows: CostRow[],
): RepairEstimate {
  const totals: Record<"showroom" | "local_mechanic", { min: number; max: number }> = {
    showroom: { min: 0, max: 0 },
    local_mechanic: { min: 0, max: 0 },
  };
  let matched = false;

  for (const detection of detections) {
    for (const serviceType of ["showroom", "local_mechanic"] as const) {
      const row = pickRow(rows, detection, serviceType);
      if (row) {
        matched = true;
        const factor =
          row.severity === detection.severity
            ? 1
            : SEVERITY_MULTIPLIER[detection.severity] /
              (SEVERITY_MULTIPLIER[row.severity as Severity] ?? 1);
        totals[serviceType].min += Math.round(row.min_cost * factor);
        totals[serviceType].max += Math.round(row.max_cost * factor);
      } else {
        const base = BASELINE[detection.class] ?? BASELINE['scratch']!;
        const factor = SEVERITY_MULTIPLIER[detection.severity];
        totals[serviceType].min += Math.round(base[serviceType][0] * factor);
        totals[serviceType].max += Math.round(base[serviceType][1] * factor);
      }
    }
  }

  const round = (value: number) => Math.round(value / 100) * 100;

  return {
    showroom: { min: round(totals.showroom.min), max: round(totals.showroom.max) },
    local_mechanic: {
      min: round(totals.local_mechanic.min),
      max: round(totals.local_mechanic.max),
    },
    matched,
  };
}
