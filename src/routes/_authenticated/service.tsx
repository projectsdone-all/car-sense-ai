import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { humanisePart } from "@/lib/format";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { EmptyState, ErrorState, SkeletonList } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceReminderCard } from "@/components/service/ServiceReminderCard";
import { db } from "@/lib/db";
import { fetchReminders, fetchTips, fetchVehicles, readSelectedVehicleId } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/service")({
  head: () => ({
    meta: [
      { title: "Service reminders — Car Sense AI" },
      {
        name: "description",
        content:
          "Track oil changes, brake inspections, tyre rotation, battery checks and insurance renewals by date or mileage.",
      },
      { property: "og:title", content: "Service reminders — Car Sense AI" },
      { property: "og:description", content: "Keep your vehicle's maintenance on schedule." },
    ],
  }),
  component: ServiceScreen,
});

const SERVICE_TYPES = [
  "oil_change",
  "general_service",
  "brake_inspection",
  "tyre_rotation",
  "battery_check",
  "insurance_renewal",
] as const;

function ServiceScreen() {
  const queryClient = useQueryClient();
  const reminders = useQuery({ queryKey: ["reminders"], queryFn: fetchReminders });
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
  const tips = useQuery({ queryKey: ["tips"], queryFn: fetchTips });

  const [serviceType, setServiceType] = useState<string>("oil_change");
  const [dueDate, setDueDate] = useState("");
  const [dueMileage, setDueMileage] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await db.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Your session expired. Please sign in again.");
      const storedVehicle = readSelectedVehicleId();
      const vehicleId =
        storedVehicle && (vehicles.data ?? []).some((v) => v.id === storedVehicle)
          ? storedVehicle
          : (vehicles.data ?? [])[0]?.id ?? null;
      const { error } = await db.from("service_reminders").insert({
        user_id: userId,
        vehicle_id: vehicleId,
        service_type: serviceType,
        due_date: dueDate || null,
        due_mileage: dueMileage ? Number(dueMileage) : null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setDueDate("");
      setDueMileage("");
      toast.success("Service reminder added.");
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Reminder could not be added."),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await db
        .from("service_reminders")
        .update({ completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("service_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Reminder removed.");
      await queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  const tip = tips.data?.[0];

  return (
    <AppScreen>
      <PageHeader title="Service" description="Reminders and health tips" backTo="/" />

      <Section title="Add reminder">
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="space-y-1.5">
            <Label htmlFor="service-type">Service</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger id="service-type" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {humanisePart(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="due-date">Due date</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-mileage">Due mileage (km)</Label>
              <Input
                id="due-mileage"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="45000"
                value={dueMileage}
                onChange={(event) => setDueMileage(event.target.value)}
                className="min-h-11"
              />
            </div>
          </div>
          <Button
            className="min-h-12 w-full"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            Add reminder
          </Button>
        </div>
      </Section>

      <Section title="Your reminders">
        {reminders.isLoading ? (
          <SkeletonList rows={2} />
        ) : reminders.isError ? (
          <ErrorState
            message="Reminders could not be loaded."
            onRetry={() => reminders.refetch()}
          />
        ) : (reminders.data ?? []).length === 0 ? (
          <EmptyState
            title="No reminders yet."
            description="Add your next service or insurance renewal so it is never missed."
          />
        ) : (
          <ul className="space-y-2">
            {(reminders.data ?? []).map((reminder) => (
              <li key={reminder.id}>
                <ServiceReminderCard
                  reminder={reminder}
                  onToggle={() =>
                    toggle.mutate({ id: reminder.id, completed: !reminder.completed })
                  }
                  onDelete={() => remove.mutate(reminder.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Vehicle health tips">
        {tips.isLoading ? (
          <SkeletonList rows={2} />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            {(tips.data ?? []).map((item) => (
              <li key={item.id} className="flex gap-3 px-4 py-3">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {tip ? null : null}
      </Section>
    </AppScreen>
  );
}
