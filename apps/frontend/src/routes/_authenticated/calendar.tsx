import { activityMonthSchema } from "#/features/activity/queries";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/calendar")({
  validateSearch: z.object({ month: activityMonthSchema }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/activity", search, replace: true });
  },
});
