import { useEffect, useState } from "react";
import type { Session, AuthUser as User } from "@/lib/db";
import { db } from "@/lib/db";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    db.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = db.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null as User | null, loading };
}
