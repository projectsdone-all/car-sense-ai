import { CalendarClock, Check, Trash2 } from "lucide-react";
import type { ServiceReminder } from "@/types";
import { formatDate, humanisePart } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function ServiceReminderCard({
  reminder,
  onToggle,
  onDelete,
}: {
  reminder: ServiceReminder;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <CalendarClock className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${reminder.completed ? "text-muted-foreground line-through" : ""}`}
        >
          {humanisePart(reminder.service_type)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[
            reminder.due_date ? `Due ${formatDate(reminder.due_date)}` : null,
            reminder.due_mileage ? `${reminder.due_mileage.toLocaleString("en-IN")} km` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "No due date set"}
        </p>
      </div>
      {onToggle ? (
        <Button
          variant={reminder.completed ? "secondary" : "outline"}
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={reminder.completed ? "Mark as pending" : "Mark as completed"}
          onClick={onToggle}
        >
          <Check className="size-4" aria-hidden />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Delete reminder"
          onClick={onDelete}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      ) : null}
    </article>
  );
}
