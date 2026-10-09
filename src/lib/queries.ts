import { db } from "@/lib/db";
import type {
  DamageReport,
  Mechanic,
  ParkingLocation,
  Profile,
  RepairGuide,
  ServiceReminder,
  Vehicle,
  VehicleTip,
} from "@/types";

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await db
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Vehicle[];
}

export async function fetchReports(limit?: number): Promise<DamageReport[]> {
  let query = db.from("damage_reports").select("*").order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DamageReport[];
}

export async function fetchReport(id: string) {
  const { data, error } = await db
    .from("damage_reports")
    .select("*, damage_detections(*), vehicles(nickname, brand, model)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMechanics(): Promise<Mechanic[]> {
  const { data, error } = await db.from("mechanics").select("*").order("rating", {
    ascending: false,
  });
  if (error) throw error;
  return (data ?? []) as Mechanic[];
}

export async function fetchTips(): Promise<VehicleTip[]> {
  const { data, error } = await db.from("vehicle_tips").select("*");
  if (error) throw error;
  return (data ?? []) as VehicleTip[];
}

export async function fetchGuides(): Promise<RepairGuide[]> {
  const { data, error } = await db.from("repair_guides").select("*");
  if (error) throw error;
  return (data ?? []) as RepairGuide[];
}

export async function fetchReminders(): Promise<ServiceReminder[]> {
  const { data, error } = await db
    .from("service_reminders")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ServiceReminder[];
}

export async function fetchParking(): Promise<ParkingLocation[]> {
  const { data, error } = await db
    .from("parking_locations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ParkingLocation[];
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Profile | null;
}

const SELECTED_VEHICLE_KEY = "carsense.selectedVehicle";

export function readSelectedVehicleId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_VEHICLE_KEY);
}

export function writeSelectedVehicleId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_VEHICLE_KEY, id);
}
