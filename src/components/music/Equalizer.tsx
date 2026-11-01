import { cn } from "@/lib/utils";

export function Equalizer({ playing, small = false }: { playing: boolean; small?: boolean }) {
  return (
    <span className={cn("flex items-end gap-[3px]", small ? "h-4" : "h-9")} aria-hidden>
      {[0, 1, 2, 3, 4].slice(0, small ? 4 : 5).map((i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full", small ? "bg-current" : "bg-primary", playing ? "animate-eq" : "")}
          style={{ height: playing ? undefined : "30%", animationDelay: `${i * 0.13}s`, ...(small ? {} : { width: 4 }) }}
        />
      ))}
    </span>
  );
}
