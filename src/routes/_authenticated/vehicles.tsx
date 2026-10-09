import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { EmptyState, ErrorState, SkeletonList } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { db } from "@/lib/db";
import { fetchVehicles, readSelectedVehicleId, writeSelectedVehicleId } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/vehicles")({
  head: () => ({
    meta: [
      { title: "Your vehicles — Car Sense AI" },
      {
        name: "description",
        content:
          "Add and manage the vehicles you inspect: nickname, brand, model, year, registration number and current mileage.",
      },
      { property: "og:title", content: "Your vehicles — Car Sense AI" },
      { property: "og:description", content: "Manage the vehicles you scan and service." },
    ],
  }),
  component: VehiclesScreen,
});

function VehiclesScreen() {
  const queryClient = useQueryClient();
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
  const [selectedId, setSelectedId] = useState<string | null>(readSelectedVehicleId());
  const [form, setForm] = useState({
    nickname: "",
    brand: "",
    model: "",
    year: "",
    registration_number: "",
    current_mileage: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await db.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Your session expired. Please sign in again.");
      const { error } = await db.from("vehicles").insert({
        user_id: userId,
        nickname: form.nickname.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : null,
        registration_number: form.registration_number.trim().toUpperCase() || null,
        current_mileage: form.current_mileage ? Number(form.current_mileage) : null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setForm({
        nickname: "",
        brand: "",
        model: "",
        year: "",
        registration_number: "",
        current_mileage: "",
      });
      toast.success("Vehicle added.");
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Vehicle could not be added."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Vehicle removed.");
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  return (
    <AppScreen>
      <PageHeader title="Vehicles" description="Your garage" backTo="/" />

      <Section title="Your vehicles">
        {vehicles.isLoading ? (
          <SkeletonList rows={2} />
        ) : vehicles.isError ? (
          <ErrorState message="Vehicles could not be loaded." onRetry={() => vehicles.refetch()} />
        ) : (vehicles.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Car className="size-6" aria-hidden />}
            title="No vehicles yet."
            description="Add your car to start inspecting damage and tracking service."
          />
        ) : (
          <ul className="space-y-2">
            {(vehicles.data ?? []).map((vehicle) => (
              <li key={vehicle.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <VehicleCard
                    vehicle={vehicle}
                    selected={selectedId === vehicle.id}
                    onSelect={() => {
                      setSelectedId(vehicle.id);
                      writeSelectedVehicleId(vehicle.id);
                      toast.success(`${vehicle.nickname} set as current vehicle.`);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label={`Delete ${vehicle.nickname}`}
                  onClick={() => remove.mutate(vehicle.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Add a vehicle">
        <form
          className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              required
              placeholder="Family Swift"
              value={form.nickname}
              onChange={(event) => setForm({ ...form, nickname: event.target.value })}
              className="min-h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                required
                placeholder="Maruti Suzuki"
                value={form.brand}
                onChange={(event) => setForm({ ...form, brand: event.target.value })}
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                required
                placeholder="Swift VXi"
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
                className="min-h-11"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                inputMode="numeric"
                min={1980}
                max={2030}
                placeholder="2021"
                value={form.year}
                onChange={(event) => setForm({ ...form, year: event.target.value })}
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mileage">Mileage (km)</Label>
              <Input
                id="mileage"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="38500"
                value={form.current_mileage}
                onChange={(event) => setForm({ ...form, current_mileage: event.target.value })}
                className="min-h-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="registration">Registration number</Label>
            <Input
              id="registration"
              placeholder="MH 12 AB 3456"
              value={form.registration_number}
              onChange={(event) => setForm({ ...form, registration_number: event.target.value })}
              className="min-h-11"
            />
          </div>
          <Button type="submit" className="min-h-12 w-full" disabled={create.isPending}>
            Add vehicle
          </Button>
        </form>
      </Section>
    </AppScreen>
  );
}
