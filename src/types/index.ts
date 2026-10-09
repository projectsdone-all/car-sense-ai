export type DamageType = "scratch" | "dent" | "crack" | "broken_part";
export type Severity = "minor" | "moderate" | "severe";
export type ServiceType = "showroom" | "local_mechanic";

export interface BoundingBox {
  /** Pixel coordinates relative to the analysed image's natural size. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DamageDetection {
  id?: string;
  class: DamageType;
  confidence: number;
  severity: Severity;
  part: string;
  bbox: BoundingBox;
}

export interface DetectionResult {
  success: boolean;
  detections: DamageDetection[];
  /** "mock" = demo inference, "api" = your YOLOv8 service, "gemini" = Gemini vision AI. */
  source: "mock" | "api" | "gemini";
  imageWidth: number;
  imageHeight: number;
  /** Plain-language summary from the AI assessor (Gemini only). */
  summary?: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface Vehicle {
  id: string;
  user_id: string;
  nickname: string;
  brand: string;
  model: string;
  year: number | null;
  registration_number: string | null;
  current_mileage: number | null;
  created_at: string;
}

export interface DamageReport {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  image_path: string | null;
  analysis_status: string;
  source: string;
  min_cost: number | null;
  max_cost: number | null;
  created_at: string;
}

export interface RepairEstimate {
  showroom: { min: number; max: number };
  local_mechanic: { min: number; max: number };
  matched: boolean;
}

export interface Mechanic {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  phone: string | null;
  services: string[];
  is_open: boolean;
}

export interface ParkingLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  name: string;
  note: string | null;
  created_at: string;
}

export interface ServiceReminder {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  service_type: string;
  due_date: string | null;
  due_mileage: number | null;
  completed: boolean;
}

export interface VehicleTip {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface RepairGuide {
  id: string;
  damage_type: string;
  severity: string;
  title: string;
  content: string;
  video_url: string | null;
}

export interface EmergencyEvent {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  message: string | null;
  created_at: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}
