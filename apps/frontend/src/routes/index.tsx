import { authClient } from "#/auth/authClient";
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const session = authClient.useSession();

  if (session.data) return <Navigate to="/media" />;
  return <Navigate to="/auth/login" />;
}
