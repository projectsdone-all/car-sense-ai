import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { AppScreen, Section } from "@/components/layout/AppScreen";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/States";
import { Equalizer } from "@/components/music/Equalizer";
import {
  addFiles,
  cycleRepeat,
  formatSize,
  formatTime,
  loadLibrary,
  next,
  playTrack,
  prev,
  removeTrack,
  seek,
  setShuffle,
  toggle,
  usePlayer,
} from "@/lib/music";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/music")({
  head: () => ({
    meta: [
      { title: "Drive music — Car Sense AI" },
      { name: "description", content: "Play your own songs offline while you drive." },
    ],
  }),
  component: MusicScreen,
});

function MusicScreen() {
  const player = usePlayer();
  const input = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);

  useEffect(() => {
    if (!player.loaded) void loadLibrary();
  }, [player.loaded]);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setAdding(true);
    try {
      const count = await addFiles(Array.from(list));
      if (count) toast.success(`${count} song${count > 1 ? "s" : ""} saved for offline play.`);
      else toast.error("Those files are not audio. Pick MP3, M4A, WAV or OGG songs.");
    } catch {
      toast.error("Could not save the songs. Your phone storage may be full.");
    } finally {
      setAdding(false);
    }
  }

  const totalSize = player.library.reduce((sum, t) => sum + t.size, 0);
  const time = scrub ?? player.time;
  const duration = player.duration || player.current?.duration || 0;
  const RepeatIcon = player.repeat === "one" ? Repeat1 : Repeat;

  return (
    <AppScreen>
      <PageHeader
        title="Drive music"
        description="Saved on this phone · plays offline"
        action={
          <Button size="sm" className="min-h-9" onClick={() => input.current?.click()} disabled={adding}>
            {adding ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />} Add songs
          </Button>
        }
      />
      <input
        ref={input}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac"
        multiple
        className="sr-only"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-2">
        {/* Now playing */}
        <div className="px-4 pt-4 lg:sticky lg:top-6 lg:col-span-5">
          <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-[linear-gradient(165deg,oklch(0.3_0.08_260/0.9),oklch(0.17_0.03_258/0.95))] p-5 shadow-[var(--shadow-raised)]">
            <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[oklch(0.6_0.2_300/0.3)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-primary/20 blur-3xl" />

            <div className="relative mx-auto flex aspect-square w-full max-w-[15rem] items-center justify-center">
              <div
                className={cn(
                  "absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,oklch(0.83_0.145_200),oklch(0.72_0.17_240),oklch(0.7_0.2_300),oklch(0.83_0.145_200))] p-[3px] shadow-[0_0_60px_-10px_oklch(0.75_0.16_230)]",
                  player.playing && "animate-[spin_8s_linear_infinite]",
                )}
              >
                <div className="size-full rounded-full bg-[repeating-radial-gradient(circle_at_center,oklch(0.16_0.02_258)_0_2px,oklch(0.19_0.02_258)_2px_4px)]" />
              </div>
              <div className="relative flex size-24 items-center justify-center rounded-full bg-background/90 ring-1 ring-border">
                {player.current ? <Equalizer playing={player.playing} /> : <Music2 className="size-9 text-primary" aria-hidden />}
              </div>
            </div>

            <div className="relative mt-5 text-center">
              <p className="font-display truncate text-xl font-bold">{player.current?.title ?? "Nothing playing"}</p>
              <p className="truncate text-sm text-muted-foreground">
                {player.current?.artist ?? (player.library.length ? "Tap a song to start" : "Add songs to build your drive playlist")}
              </p>
            </div>

            <div className="relative mt-5">
              <input
                type="range"
                min={0}
                max={Math.max(duration, 1)}
                step={0.5}
                value={Math.min(time, duration || 0)}
                onChange={(e) => setScrub(Number(e.target.value))}
                onPointerUp={() => {
                  if (scrub !== null) seek(scrub);
                  setScrub(null);
                }}
                onKeyUp={() => {
                  if (scrub !== null) seek(scrub);
                  setScrub(null);
                }}
                disabled={!player.current}
                aria-label="Seek"
                className="music-range w-full"
                style={{ ["--pct" as string]: `${duration ? (Math.min(time, duration) / duration) * 100 : 0}%` }}
              />
              <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
                <span>{formatTime(time)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="relative mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShuffle(!player.shuffle)}
                aria-label="Shuffle"
                aria-pressed={player.shuffle}
                className={cn("flex size-11 items-center justify-center rounded-full transition-colors", player.shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <Shuffle className="size-5" aria-hidden />
              </button>
              <button type="button" onClick={() => void prev()} aria-label="Previous" disabled={!player.library.length} className="flex size-12 items-center justify-center rounded-full text-foreground transition-transform active:scale-90 disabled:opacity-40">
                <SkipBack className="size-6 fill-current" aria-hidden />
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={player.playing ? "Pause" : "Play"}
                disabled={!player.library.length}
                className="bg-brand flex size-[4.5rem] items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-95 disabled:opacity-40"
              >
                {player.playing ? <Pause className="size-8 fill-current" aria-hidden /> : <Play className="ml-1 size-8 fill-current" aria-hidden />}
              </button>
              <button type="button" onClick={() => void next()} aria-label="Next" disabled={!player.library.length} className="flex size-12 items-center justify-center rounded-full text-foreground transition-transform active:scale-90 disabled:opacity-40">
                <SkipForward className="size-6 fill-current" aria-hidden />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                aria-label={`Repeat: ${player.repeat}`}
                className={cn("flex size-11 items-center justify-center rounded-full transition-colors", player.repeat !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <RepeatIcon className="size-5" aria-hidden />
              </button>
            </div>
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <WifiOff className="size-3.5 text-primary" aria-hidden /> Works offline · controls on your lock screen
          </p>
        </div>

        {/* Library */}
        <div className="lg:col-span-7">
          <Section
            title={`Playlist${player.library.length ? ` · ${player.library.length}` : ""}`}
            action={player.library.length ? <span className="text-xs text-muted-foreground">{formatSize(totalSize)} on device</span> : undefined}
          >
            {!player.loaded ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden /> Loading your songs…
              </div>
            ) : player.library.length === 0 ? (
              <EmptyState
                icon={<Music2 className="size-7 text-primary" aria-hidden />}
                title="Build your drive playlist"
                description="Pick songs from your phone once. They are saved inside the app and play even with no network — tunnels, highways, anywhere."
                action={
                  <Button className="min-h-11" onClick={() => input.current?.click()} disabled={adding}>
                    {adding ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />} Add songs
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-1.5">
                {player.library.map((track, index) => {
                  const active = player.current?.id === track.id;
                  return (
                    <li key={track.id}>
                      <div
                        className={cn(
                          "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 backdrop-blur-xl transition-colors",
                          active ? "border-primary/50 bg-primary/10" : "border-border bg-surface hover:border-primary/30",
                        )}
                      >
                        <button type="button" onClick={() => (active ? toggle() : void playTrack(track))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <span
                            className={cn(
                              "font-display flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                              active ? "bg-brand text-primary-foreground" : "bg-accent text-primary",
                            )}
                          >
                            {active ? <Equalizer playing={player.playing} small /> : index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-sm font-semibold", active && "text-primary")}>{track.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {track.artist} · {formatTime(track.duration)}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void removeTrack(track.id);
                            toast.success("Song removed from this device.");
                          }}
                          aria-label={`Remove ${track.title}`}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
          <p className="px-4 pb-4 text-xs text-muted-foreground">
            Tip: name files like “Artist - Song.mp3” to show the artist. Songs stay private on this device and are never uploaded.
          </p>
        </div>
      </div>
    </AppScreen>
  );
}
