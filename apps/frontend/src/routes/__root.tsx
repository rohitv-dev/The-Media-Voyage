import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { FullScreenLoader } from "#/components/FullScreenLoader";

import "../styles.css";

interface RouteContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouteContext>()({
  component: RootComponent,
  pendingComponent: FullScreenLoader,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <ReactQueryDevtools initialIsOpen={false} />
      {/* <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          // {
          //   name: "TanStack Router",
          //   render: <TanStackRouterDevtoolsPanel />,
          // },
          {
            name: "Tanstack Query",
            render: <ReactQueryDevtools />,
          },
        ]}
      /> */}
    </>
  );
}
