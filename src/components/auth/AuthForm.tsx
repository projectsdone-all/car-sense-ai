import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { db, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen bg-background px-5 py-12">
      <div className="app-shell">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-base font-semibold">Car Sense AI</p>
            <p className="text-xs text-muted-foreground">
              See the damage. Know the cost. Drive with confidence.
            </p>
          </div>
        </div>

        <h1 className="mt-10 text-2xl font-semibold tracking-tight">
          {mode === "login" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === "login"
            ? "Continue where you left off with your vehicles and inspections."
            : "Add your vehicle and run your first damage inspection in under a minute."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
              className="min-h-11"
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
              className="min-h-11"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={loading} className="min-h-12 w-full text-base">
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
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
  );
}
