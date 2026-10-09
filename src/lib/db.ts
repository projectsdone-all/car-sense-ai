// ─────────────────────────────────────────────────────────────────────────────
// Local database — replaces the hosted backend.
//
// Everything (accounts, vehicles, reports, reminders, parking, SOS log) lives in
// this browser: tables in localStorage, photos in IndexedDB. The API mirrors the
// small part of the Supabase client the app uses, so screens stay simple:
//   db.from("vehicles").select("*").eq("id", id).maybeSingle()
// Rows are scoped to the signed-in user, like row-level security.
// ─────────────────────────────────────────────────────────────────────────────
import { SEED } from "./seed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Tables = Record<string, Row[]>;
type DbError = Error;
interface Result<T> { data: T; error: DbError | null }

export interface AuthUser { id: string; email: string; user_metadata: { full_name?: string } }
export interface Session { user: AuthUser; access_token: string }
interface Account { id: string; email: string; full_name: string; salt: string; hash: string; created_at: string }

const DB_KEY = "carsense.db.v2";
const ACCOUNTS_KEY = "carsense.accounts.v2";
const SESSION_KEY = "carsense.session.v2";

export const DEMO_EMAIL = "demo@carsense.app";
export const DEMO_PASSWORD = "demo1234";

// tables owned by a user (filtered to the current user automatically)
const OWNED = new Set(["vehicles", "damage_reports", "parking_locations", "service_reminders", "emergency_events"]);
const REFERENCE = new Set(["repair_costs", "mechanics", "vehicle_tips", "repair_guides"]);

// how nested selects like "*, damage_detections(*), vehicles(nickname)" join
const RELATIONS: Record<string, Record<string, { table: string; many: boolean; key: string }>> = {
  damage_reports: {
    damage_detections: { table: "damage_detections", many: true, key: "report_id" },
    vehicles: { table: "vehicles", many: false, key: "vehicle_id" },
  },
  service_reminders: { vehicles: { table: "vehicles", many: false, key: "vehicle_id" } },
};

const DEFAULTS: Record<string, Row> = {
  damage_reports: { analysis_status: "completed", source: "mock", vehicle_id: null, image_path: null, min_cost: null, max_cost: null },
  service_reminders: { completed: false, due_date: null, due_mileage: null, vehicle_id: null },
  vehicles: { year: null, registration_number: null, current_mileage: null },
  parking_locations: { note: null },
  emergency_events: { message: null },
};

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
const now = () => new Date().toISOString();

function readJSON<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function writeJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error("Your browser storage is full. Delete some old inspections and try again."); }
}

function load(): Tables {
  const t = readJSON<Tables>(DB_KEY, {});
  for (const name of Object.keys(SEED)) t[name] = SEED[name]!.map((r) => ({ ...r })) as Row[];
  return t;
}
let tables = load();
const save = () => {
  const own: Tables = {};
  for (const [k, v] of Object.entries(tables)) if (!REFERENCE.has(k)) own[k] = v;
  writeJSON(DB_KEY, own);
};
const table = (name: string) => (tables[name] ??= []);

// ── auth ────────────────────────────────────────────────────────────────────
async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const accounts = () => readJSON<Account[]>(ACCOUNTS_KEY, []);
let session: Session | null = readJSON<Session | null>(SESSION_KEY, null);
const listeners = new Set<(event: string, s: Session | null) => void>();
function setSession(s: Session | null, event: string) {
  session = s;
  if (s) writeJSON(SESSION_KEY, s); else localStorage.removeItem(SESSION_KEY);
  listeners.forEach((f) => f(event, s));
}
const toSession = (a: Account): Session => ({ user: { id: a.id, email: a.email, user_metadata: { full_name: a.full_name } }, access_token: a.id });

async function createAccount(email: string, password: string, fullName: string) {
  const list = accounts();
  if (list.some((a) => a.email === email)) throw new Error("An account with this email already exists. Sign in instead.");
  const salt = uuid();
  const acc: Account = { id: uuid(), email, full_name: fullName, salt, hash: await sha(salt + password), created_at: now() };
  writeJSON(ACCOUNTS_KEY, [...list, acc]);
  table("profiles").push({ id: acc.id, full_name: fullName || null, email, avatar_url: null, created_at: now(), updated_at: now() });
  save();
  return acc;
}

/** Creates the shared demo account (with a sample car and reminders) the first time it is used */
async function ensureDemo() {
  if (accounts().some((a) => a.email === DEMO_EMAIL)) return;
  const acc = await createAccount(DEMO_EMAIL, DEMO_PASSWORD, "Demo Driver");
  const vid = uuid();
  table("vehicles").push({ id: vid, user_id: acc.id, nickname: "Daily driver", brand: "Maruti Suzuki", model: "Swift", year: 2021, registration_number: "KA 01 AB 1234", current_mileage: 28450, created_at: now(), updated_at: now() });
  const d = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  table("service_reminders").push(
    { id: uuid(), user_id: acc.id, vehicle_id: vid, service_type: "general_service", due_date: d(12), due_mileage: 30000, completed: false, created_at: now(), updated_at: now() },
    { id: uuid(), user_id: acc.id, vehicle_id: vid, service_type: "insurance_renewal", due_date: d(45), due_mileage: null, completed: false, created_at: now(), updated_at: now() },
  );
  save();
}

const fail = (message: string) => new Error(message);

export const auth = {
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string } } }) {
    try {
      email = email.trim().toLowerCase();
      if (password.length < 6) return { data: { session: null, user: null }, error: fail("Password must be at least 6 characters.") };
      const acc = await createAccount(email, password, options?.data?.full_name?.trim() ?? "");
      const s = toSession(acc);
      setSession(s, "SIGNED_IN");
      return { data: { session: s, user: s.user }, error: null };
    } catch (e) { return { data: { session: null, user: null }, error: fail((e as Error).message) }; }
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    email = email.trim().toLowerCase();
    if (email === DEMO_EMAIL) await ensureDemo();
    const acc = accounts().find((a) => a.email === email);
    if (!acc || (await sha(acc.salt + password)) !== acc.hash) return { data: { session: null, user: null }, error: fail("Invalid email or password.") };
    const s = toSession(acc);
    setSession(s, "SIGNED_IN");
    return { data: { session: s, user: s.user }, error: null };
  },
  async signOut() { setSession(null, "SIGNED_OUT"); return { error: null }; },
  async getSession() { return { data: { session }, error: null }; },
  async getUser() { return session ? { data: { user: session.user }, error: null } : { data: { user: null }, error: fail("Not signed in") }; },
  onAuthStateChange(cb: (event: string, s: Session | null) => void) {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
};

// ── query builder ───────────────────────────────────────────────────────────
type Op = "select" | "insert" | "update" | "delete";

function visible(name: string): Row[] {
  const rows = table(name);
  if (REFERENCE.has(name)) return rows;
  const uid = session?.user.id;
  if (!uid) return [];
  if (OWNED.has(name)) return rows.filter((r) => r["user_id"] === uid);
  if (name === "profiles") return rows.filter((r) => r["id"] === uid);
  if (name === "damage_detections") {
    const mine = new Set(table("damage_reports").filter((r) => r["user_id"] === uid).map((r) => r["id"]));
    return rows.filter((r) => mine.has(r["report_id"]));
  }
  return rows;
}

function splitTop(s: string) {
  const out: string[] = []; let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function project(name: string, row: Row, columns: string): Row {
  const parts = splitTop(columns || "*");
  const out: Row = {};
  for (const p of parts) {
    const m = p.match(/^(\w+)\((.*)\)$/s);
    if (m) {
      const rel = RELATIONS[name]?.[m[1]!];
      if (!rel) continue;
      const inner = m[2]!;
      if (rel.many) out[m[1]!] = visible(rel.table).filter((r) => r[rel.key] === row["id"]).map((r) => project(rel.table, r, inner));
      else { const t = visible(rel.table).find((r) => r["id"] === row[rel.key]); out[m[1]!] = t ? project(rel.table, t, inner) : null; }
    } else if (p === "*") Object.assign(out, row);
    else out[p] = row[p] ?? null;
  }
  return out;
}

function cascade(name: string, removed: Row[]) {
  const ids = new Set(removed.map((r) => r["id"]));
  if (name === "damage_reports") {
    tables["damage_detections"] = table("damage_detections").filter((d) => !ids.has(d["report_id"]));
    removed.forEach((r) => { if (r["image_path"]) void images.remove(String(r["image_path"])); });
  }
  if (name === "vehicles") {
    table("damage_reports").forEach((r) => { if (ids.has(r["vehicle_id"])) r["vehicle_id"] = null; });
    tables["service_reminders"] = table("service_reminders").filter((r) => !ids.has(r["vehicle_id"]));
  }
}

class Query<T = Row[]> implements PromiseLike<Result<T>> {
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private max?: number;
  private columns = "*";
  private returning = false;
  private mode: "many" | "single" | "maybe" = "many";
  private op: Op = "select";
  private payload: Row | Row[] | null = null;
  constructor(private name: string) {}

  select(columns = "*") { this.columns = columns; if (this.op !== "select") this.returning = true; return this; }
  insert(rows: Row | Row[]) { this.op = "insert"; this.payload = rows; return this; }
  update(patch: Row) { this.op = "update"; this.payload = patch; return this; }
  delete() { this.op = "delete"; return this; }
  eq(col: string, val: unknown) { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: unknown) { this.filters.push((r) => r[col] !== val); return this; }
  in(col: string, vals: unknown[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}) { this.orders.push({ col, asc: opts.ascending ?? true, nullsFirst: opts.nullsFirst ?? false }); return this; }
  limit(n: number) { this.max = n; return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single() { this.mode = "single"; return this as unknown as Query<any>; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maybeSingle() { this.mode = "maybe"; return this as unknown as Query<any>; }

  private run(): Result<unknown> {
    const uid = session?.user.id;
    if (!REFERENCE.has(this.name) && !uid) return { data: null, error: fail("Your session expired. Please sign in again.") };
    let rows: Row[];
    if (this.op === "insert") {
      if (REFERENCE.has(this.name)) return { data: null, error: fail("Read-only table") };
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((r) => ({
        id: uuid(), created_at: now(), updated_at: now(), ...DEFAULTS[this.name], ...r, ...(OWNED.has(this.name) ? { user_id: uid } : {}),
      }));
      table(this.name).push(...list);
      save();
      rows = list;
    } else {
      rows = visible(this.name).filter((r) => this.filters.every((f) => f(r)));
      if (this.op === "update") {
        if (REFERENCE.has(this.name)) return { data: null, error: fail("Read-only table") };
        rows.forEach((r) => Object.assign(r, this.payload, { updated_at: now() }));
        save();
      } else if (this.op === "delete") {
        if (REFERENCE.has(this.name)) return { data: null, error: fail("Read-only table") };
        const gone = new Set(rows);
        tables[this.name] = table(this.name).filter((r) => !gone.has(r));
        cascade(this.name, rows);
        save();
      }
    }
    if (this.op !== "select" && !this.returning) return { data: null, error: null };
    for (const o of [...this.orders].reverse()) {
      rows = [...rows].sort((a, b) => {
        const x = a[o.col], y = b[o.col];
        if (x == null || y == null) return x == null && y == null ? 0 : (x == null) === o.nullsFirst ? -1 : 1;
        const c = x < y ? -1 : x > y ? 1 : 0;
        return o.asc ? c : -c;
      });
    }
    if (this.max !== undefined) rows = rows.slice(0, this.max);
    const data = rows.map((r) => project(this.name, r, this.columns));
    if (this.mode === "many") return { data, error: null };
    if (this.mode === "single" && data.length !== 1) return { data: null, error: fail(data.length ? "More than one row found" : "Not found") };
    return { data: data[0] ?? null, error: null };
  }

  then<A = Result<T>, B = never>(ok?: ((v: Result<T>) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.run() as Result<T>).then(ok, err);
  }
}

// ── photo storage (IndexedDB) ───────────────────────────────────────────────
const idb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open("carsense-images", 1);
  req.onupgradeneeded = () => req.result.createObjectStore("images");
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const d = await idb();
  return new Promise<T>((resolve, reject) => {
    const r = fn(d.transaction("images", mode).objectStore("images"));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
};
const urlCache = new Map<string, string>();
export const images = {
  async put(path: string, blob: Blob) { await tx("readwrite", (s) => s.put(blob, path)); },
  async url(path: string) {
    if (urlCache.has(path)) return urlCache.get(path)!;
    const blob = await tx<Blob | undefined>("readonly", (s) => s.get(path));
    if (!blob) return null;
    const u = URL.createObjectURL(blob);
    urlCache.set(path, u);
    return u;
  },
  async remove(path: string) { await tx("readwrite", (s) => s.delete(path)); urlCache.delete(path); },
};

export const storage = {
  from: (_bucket: string) => ({
    async upload(path: string, file: Blob, _opts?: unknown) {
      try { await images.put(path, file); return { data: { path }, error: null }; }
      catch (e) { return { data: null, error: fail("Could not save the photo: " + (e as Error).message) }; }
    },
    async createSignedUrl(path: string, _expires: number) {
      const signedUrl = await images.url(path).catch(() => null);
      return signedUrl ? { data: { signedUrl }, error: null } : { data: null, error: fail("Image not found") };
    },
    async remove(paths: string[]) { await Promise.all(paths.map((p) => images.remove(p))); return { data: null, error: null }; },
  }),
};

export const db = {
  auth,
  storage,
  from: (name: string) => new Query(name),
};
