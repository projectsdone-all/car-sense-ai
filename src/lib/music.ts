// ─────────────────────────────────────────────────────────────────────────────
// Offline music — songs the user adds are stored in this browser (IndexedDB),
// so they play with no internet. One shared <audio> element drives playback
// across every screen, with lock-screen controls via the Media Session API.
// ─────────────────────────────────────────────────────────────────────────────
import { useSyncExternalStore } from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  size: number;
  addedAt: number;
}

const DB_NAME = "carsense-music";
const META = "meta";
const BLOBS = "blobs";
const PREFS_KEY = "carsense.music.prefs.v1";

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(META)) d.createObjectStore(META, { keyPath: "id" });
      if (!d.objectStoreNames.contains(BLOBS)) d.createObjectStore(BLOBS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction(store, mode);
        const r = fn(tx.objectStore(store));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }),
  );
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** "Artist - Title.mp3" → { artist, title } */
function parseName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
  const parts = base.split(/\s+[-–]\s+/);
  if (parts.length >= 2) return { artist: parts[0]!.trim(), title: parts.slice(1).join(" - ").trim() };
  return { artist: "Unknown artist", title: base || "Untitled" };
}

function readDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio();
    a.preload = "metadata";
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : 0);
    };
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done(0);
    setTimeout(() => done(a.duration || 0), 4000);
    a.src = url;
  });
}

export async function listTracks(): Promise<Track[]> {
  const rows = await run<Track[]>(META, "readonly", (s) => s.getAll() as IDBRequest<Track[]>);
  return rows.sort((a, b) => a.addedAt - b.addedAt);
}

export async function addFiles(files: File[]): Promise<number> {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(file.name)) continue;
    const id = uid();
    const { title, artist } = parseName(file.name);
    const duration = await readDuration(file);
    await run(BLOBS, "readwrite", (s) => s.put(file, id));
    await run(META, "readwrite", (s) => s.put({ id, title, artist, duration, size: file.size, addedAt: Date.now() + added } satisfies Track));
    added += 1;
  }
  if (added) {
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* not supported */
    }
  }
  await refreshLibrary();
  return added;
}

export async function removeTrack(id: string) {
  await run(META, "readwrite", (s) => s.delete(id));
  await run(BLOBS, "readwrite", (s) => s.delete(id));
  if (state.current?.id === id) {
    audio()?.pause();
    setState({ current: null, playing: false, time: 0, duration: 0 });
  }
  await refreshLibrary();
}

// ── player store ────────────────────────────────────────────────────────────
export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  library: Track[];
  loaded: boolean;
  current: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

function loadPrefs(): Pick<PlayerState, "shuffle" | "repeat"> {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return { shuffle: !!p.shuffle, repeat: p.repeat === "one" || p.repeat === "all" ? p.repeat : "all" };
  } catch {
    return { shuffle: false, repeat: "all" };
  }
}

let state: PlayerState = { library: [], loaded: false, current: null, playing: false, time: 0, duration: 0, ...loadPrefs() };
const listeners = new Set<() => void>();

function setState(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  if ("shuffle" in patch || "repeat" in patch) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ shuffle: state.shuffle, repeat: state.repeat }));
    } catch {
      /* storage unavailable */
    }
  }
  listeners.forEach((l) => l());
}

export function usePlayer(): PlayerState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

async function refreshLibrary() {
  try {
    setState({ library: await listTracks(), loaded: true });
  } catch {
    setState({ loaded: true });
  }
}
export const loadLibrary = refreshLibrary;

let el: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let lastTimeEmit = 0;

function audio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (el) return el;
  el = new Audio();
  el.preload = "auto";
  el.addEventListener("play", () => setState({ playing: true }));
  el.addEventListener("pause", () => setState({ playing: false }));
  el.addEventListener("loadedmetadata", () => setState({ duration: el!.duration || 0 }));
  el.addEventListener("timeupdate", () => {
    const now = performance.now();
    if (now - lastTimeEmit > 250) {
      lastTimeEmit = now;
      setState({ time: el!.currentTime });
    }
    if ("mediaSession" in navigator && el!.duration) {
      try {
        navigator.mediaSession.setPositionState({ duration: el!.duration, position: el!.currentTime, playbackRate: 1 });
      } catch {
        /* ignore */
      }
    }
  });
  el.addEventListener("ended", () => {
    if (state.repeat === "one") {
      el!.currentTime = 0;
      void el!.play();
    } else {
      void next(true);
    }
  });
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => void el?.play());
    ms.setActionHandler("pause", () => el?.pause());
    ms.setActionHandler("previoustrack", () => void prev());
    ms.setActionHandler("nexttrack", () => void next());
    try {
      ms.setActionHandler("seekto", (d) => d.seekTime !== undefined && seek(d.seekTime));
    } catch {
      /* ignore */
    }
  }
  return el;
}

export async function playTrack(track: Track) {
  const a = audio();
  if (!a) return;
  const blob = await run<Blob | undefined>(BLOBS, "readonly", (s) => s.get(track.id) as IDBRequest<Blob | undefined>);
  if (!blob) return;
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(blob);
  a.src = currentUrl;
  setState({ current: track, time: 0, duration: track.duration });
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: "Car Sense AI · Drive music",
      artwork: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });
  }
  try {
    await a.play();
  } catch {
    setState({ playing: false });
  }
}

export function toggle() {
  const a = audio();
  if (!a) return;
  if (!state.current) {
    if (state.library[0]) void playTrack(state.shuffle ? pickRandom() : state.library[0]);
    return;
  }
  if (a.paused) void a.play();
  else a.pause();
}

function pickRandom(exclude?: string): Track {
  const pool = state.library.filter((t) => t.id !== exclude);
  return (pool.length ? pool : state.library)[Math.floor(Math.random() * (pool.length || state.library.length))]!;
}

export async function next(auto = false) {
  const lib = state.library;
  if (!lib.length) return;
  if (state.shuffle) return playTrack(pickRandom(state.current?.id));
  const i = lib.findIndex((t) => t.id === state.current?.id);
  if (i === lib.length - 1 && auto && state.repeat === "off") {
    audio()?.pause();
    return;
  }
  return playTrack(lib[(i + 1) % lib.length]!);
}

export async function prev() {
  const a = audio();
  const lib = state.library;
  if (!lib.length) return;
  if (a && a.currentTime > 3) {
    a.currentTime = 0;
    return;
  }
  const i = lib.findIndex((t) => t.id === state.current?.id);
  return playTrack(lib[(i - 1 + lib.length) % lib.length]!);
}

export function seek(seconds: number) {
  const a = audio();
  if (!a) return;
  a.currentTime = Math.max(0, Math.min(seconds, a.duration || seconds));
  setState({ time: a.currentTime });
}

export const setShuffle = (shuffle: boolean) => setState({ shuffle });
export const cycleRepeat = () => setState({ repeat: state.repeat === "all" ? "one" : state.repeat === "one" ? "off" : "all" });

export function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function formatSize(bytes: number) {
  return bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(0.1, bytes / 1e6).toFixed(1)} MB`;
}
