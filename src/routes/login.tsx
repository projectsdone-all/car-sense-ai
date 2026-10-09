import { createFileRoute, redirect } from "@tanstack/react-router";
import { db } from "@/lib/db";
import { AuthForm } from "@/components/auth/AuthForm";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await db.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Car Sense AI" },
      {
        name: "description",
        content:
          "Sign in to Car Sense AI to scan your vehicle for damage, get repair estimates and find nearby mechanics.",
      },
      { property: "og:title", content: "Sign in — Car Sense AI" },
      {
        property: "og:description",
        content: "Scan your vehicle, understand the damage and know the repair cost.",
      },
    ],
  }),
  component: () => <AuthForm mode="login" />,
});
