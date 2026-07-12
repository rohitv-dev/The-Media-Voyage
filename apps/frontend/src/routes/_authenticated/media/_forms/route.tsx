import { userMediaDropdownOptions } from "#/features/media/queries";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/media/_forms")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(userMediaDropdownOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
