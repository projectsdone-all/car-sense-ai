import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Pause, Play, SkipForward } from "lucide-react";
import { loadLibrary, next, toggle, usePlayer } from "@/lib/music";
import { Equalizer } from "@/components/music/Equalizer";

/** Persistent now-playing bar shown on every screen while a song is loaded. */
export function MiniPlayer() {
  const player = usePlayer();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!player.loaded) void loadLibrary();
  }, [player.loaded]);

  if (!player.current || path === "/music") return null;
  const pct = player.duration ? (player.time / player.duration) * 100 : 0;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] z-40 px-3 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-96 lg:px-0"
    >
      <div className="mx-auto max-w-[30rem] lg:max-w-none">
        <div className="glass relative overflow-hidden rounded-2xl shadow-[var(--shadow-raised)]">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-[oklch(1_0_0/0.08)]">
            <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Link to="/music" className="flex min-w-0 flex-1 items-center gap-3">
              <span className="bg-brand flex size-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground">
                <Equalizer playing={player.playing} small />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{player.current.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{player.current.artist}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label={player.playing ? "Pause" : "Play"}
              className="flex size-10 items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-90"
            >
              {player.playing ? <Pause className="size-5 fill-current" aria-hidden /> : <Play className="ml-0.5 size-5 fill-current" aria-hidden />}
            </button>
            <button type="button" onClick={() => void next()} aria-label="Next song" className="flex size-10 items-center justify-center rounded-full text-foreground active:scale-90">
              <SkipForward className="size-5 fill-current" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
