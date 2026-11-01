import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BrainCircuit, IndianRupee, Loader2, MapPinned, ScanLine, Sparkles } from "lucide-react";
import { CarScan } from "@/components/common/CarScan";
import { QrCode } from "@/components/layout/QrCode";
import { toast } from "sonner";
import { db, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(mode === "login" ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(mode === "login" ? DEMO_PASSWORD : "");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await db.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (signUpError) throw signUpError;
        toast.success("Account created.");
      } else {
        const { error: signInError } = await db.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      navigate({ to: "/" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setGoogleLoading(true);
    setError(null);
    const { error: demoError } = await db.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    setGoogleLoading(false);
    if (demoError) {
      setError(demoError.message);
      return;
    }
    toast.success("Signed in to the demo account.");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-[linear-gradient(160deg,oklch(0.22_0.05_235),oklch(0.13_0.02_258))] p-12 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="bg-brand flex size-11 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]">
            <ScanLine className="size-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-bold">Car Sense AI</span>
        </div>
        <div className="relative my-auto max-w-xl">
          <h2 className="text-5xl font-bold leading-[1.05] xl:text-6xl">
            See the damage.
            <br />
            <span className="text-gradient">Know the cost.</span>
            <br />
            Drive with confidence.
          </h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Photograph your car, let AI mark every dent, scratch and crack, and get an instant repair estimate in rupees — plus a PDF report and a ready insurance claim.
          </p>
          <CarScan className="mt-8 max-w-lg" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="rounded-xl bg-white p-2">
            <QrCode className="size-20" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="block font-semibold text-foreground">Try it on your phone</span>
            Scan to open — installs like an app.
          </p>
        </div>
      </aside>
      <div className="px-5 pb-12 pt-8 lg:flex lg:items-center lg:justify-center lg:py-12">
      <div className="app-shell relative animate-rise">
        <div className="flex items-center gap-2.5 lg:hidden">
          <span className="bg-brand flex size-10 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]">
            <ScanLine className="size-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="font-display block text-base font-bold tracking-tight">Car Sense AI</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Damage intelligence</span>
          </span>
        </div>

        <div className="hud-corners relative mt-6 overflow-hidden rounded-3xl lg:hidden border border-primary/25 bg-[linear-gradient(160deg,oklch(0.27_0.06_230/0.8),oklch(0.17_0.03_258/0.85))] px-4 pb-4 pt-6">
          <div className="pointer-events-none absolute -left-10 -top-16 size-48 rounded-full bg-primary/25 blur-3xl" />
          <CarScan />
          <div className="relative mt-2 flex flex-wrap justify-center gap-1.5">
            {[
              { icon: BrainCircuit, label: "AI detection" },
              { icon: IndianRupee, label: "INR estimates" },
              { icon: MapPinned, label: "Help nearby" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Icon className="size-3.5 text-primary" aria-hidden /> {label}
              </span>
            ))}
          </div>
        </div>

        <h1 className="mt-8 hidden text-4xl font-bold lg:block">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <h1 className="mt-8 text-[2rem] font-bold leading-[1.1] lg:hidden">
          {mode === "login" ? (
            <>
              See the damage.
              <br />
              <span className="text-gradient">Know the cost.</span>
            </>
          ) : (
            <>
              Create your <span className="text-gradient">account</span>
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "The demo account is filled in — just press Sign in, or use your own account."
            : "Add your vehicle and run your first damage inspection in under a minute."}
        </p>

        <form onSubmit={handleSubmit} className="glass mt-6 space-y-4 rounded-3xl p-5">
          {mode === "signup" ? (
            <div className="space-y-1.5">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="min-h-11"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={loading} className="min-h-13 w-full text-base">
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full"
          onClick={handleDemo}
          disabled={googleLoading}
        >
          {googleLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Try the demo account
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}. Your account and data are saved privately in this browser.
        </p>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              New to Car Sense AI?{" "}
              <Link to="/signup" className="font-medium text-primary underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link to="/login" className="font-medium text-primary underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
      </div>
    </div>
  );
}
