import { db } from "@/lib/db";
import type { ServiceReminder } from "@/types";

const PENALTY: Record<string, number> = { minor: 3, moderate: 8, severe: 16 };

export interface HealthScore {
  score: number;
  label: string;
  tone: "good" | "ok" | "warn" | "bad";
  factors: string[];
}

/**
 * 0–100 vehicle health from recent damage (last 6 months, newer weighs more)
 * and overdue / upcoming service. Transparent rules so it can be explained on stage.
 */
export async function fetchHealthScore(vehicleId: string | null): Promise<HealthScore> {
  let reportsQuery = db.from("damage_reports").select("id, vehicle_id, created_at, damage_detections(severity)");
  if (vehicleId) reportsQuery = reportsQuery.eq("vehicle_id", vehicleId);
  const { data: reports } = await reportsQuery;
  const { data: reminders } = await db.from("service_reminders").select("*");

  const sixMonths = Date.now() - 182 * 864e5;
  let damagePenalty = 0;
  let damageCount = 0;
  for (const report of (reports ?? []) as { created_at: string; damage_detections?: { severity: string }[] }[]) {
    const time = new Date(report.created_at).getTime();
    if (time < sixMonths) continue;
    const weight = time > Date.now() - 30 * 864e5 ? 1 : 0.6;
    for (const detection of report.damage_detections ?? []) {
      damagePenalty += (PENALTY[detection.severity] ?? 5) * weight;
      damageCount += 1;
    }
  }

  const today = new Date().setHours(0, 0, 0, 0);
  let overdue = 0;
  let dueSoon = 0;
  for (const reminder of (reminders ?? []) as ServiceReminder[]) {
    if (reminder.completed || !reminder.due_date) continue;
    if (vehicleId && reminder.vehicle_id && reminder.vehicle_id !== vehicleId) continue;
    const days = (new Date(reminder.due_date).setHours(0, 0, 0, 0) - today) / 864e5;
    if (days < 0) overdue += 1;
    else if (days <= 14) dueSoon += 1;
  }

  const raw = 100 - Math.min(damagePenalty, 55) - overdue * 12 - dueSoon * 3;
  const score = Math.max(12, Math.min(100, Math.round(raw)));

  const factors: string[] = [];
  factors.push(damageCount ? `${damageCount} damage${damageCount > 1 ? "s" : ""} found in the last 6 months` : "No damage found recently");
  if (overdue) factors.push(`${overdue} service${overdue > 1 ? "s" : ""} overdue`);
  else if (dueSoon) factors.push(`${dueSoon} service${dueSoon > 1 ? "s" : ""} due within 2 weeks`);
  else factors.push("Service schedule on track");

  const [label, tone]: [string, HealthScore["tone"]] =
    score >= 85 ? ["Excellent", "good"] : score >= 70 ? ["Good", "ok"] : score >= 50 ? ["Fair", "warn"] : ["Needs attention", "bad"];
  return { score, label, tone, factors };
}
