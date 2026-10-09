import { createFileRoute, redirect } from "@tanstack/react-router";
import { db } from "@/lib/db";
import { AuthForm } from "@/components/auth/AuthForm";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const { data } = await db.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Create your account — Car Sense AI" },
      {
        name: "description",
        content:
          "Create a free Car Sense AI account to inspect vehicle damage, estimate repair costs and keep a service history.",
      },
      { property: "og:title", content: "Create your account — Car Sense AI" },
      {
        property: "og:description",
        content: "See the damage. Know the cost. Drive with confidence.",
      },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
