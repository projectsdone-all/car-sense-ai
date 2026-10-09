import { Link } from "@tanstack/react-router";
import { Car, Plus } from "lucide-react";
import type { Vehicle } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VehiclePicker({
  vehicles,
  loading,
  selectedId,
  onSelect,
}: {
  vehicles: Vehicle[];
  loading?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) return <Skeleton className="h-11 w-full rounded-lg" />;

  if (vehicles.length === 0) {
    return (
      <Link
        to="/vehicles"
        className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3 text-sm font-medium"
      >
        <Plus className="size-4 text-primary" aria-hidden />
        Add your vehicle
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedId ?? ""} onValueChange={onSelect}>
        <SelectTrigger className="min-h-11 flex-1 bg-surface" aria-label="Current vehicle">
          <span className="flex items-center gap-2">
            <Car className="size-4 text-muted-foreground" aria-hidden />
            <SelectValue placeholder="Select vehicle" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {vehicles.map((vehicle) => (
            <SelectItem key={vehicle.id} value={vehicle.id}>
              {vehicle.nickname} · {vehicle.brand} {vehicle.model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Link
        to="/vehicles"
        aria-label="Manage vehicles"
        className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground"
      >
        <Plus className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
