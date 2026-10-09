import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { db } from "@/lib/db";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await db.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
