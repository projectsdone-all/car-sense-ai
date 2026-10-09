import { db } from "@/lib/db";
import { compressImage } from "@/lib/image";

export const VEHICLE_IMAGE_BUCKET = "vehicle-images";

export async function uploadVehicleImage(userId: string, file: File): Promise<string> {
  const optimised = await compressImage(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await db.storage
    .from(VEHICLE_IMAGE_BUCKET)
    .upload(path, optimised, { contentType: optimised.type || "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

export async function getVehicleImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await db.storage
    .from(VEHICLE_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}
