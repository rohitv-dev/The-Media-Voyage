import "@fontsource-variable/lora";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/schedule/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "mantine-datatable/styles.css";
import "./styles.scss";

import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import type { MediaRecord } from "@media-voyage/shared/api";
import { FullScreenLoader } from "#/components/FullScreenLoader";
import { AppThemeProvider } from "#/theme/ThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data only ever changes via this user's own CRUD mutations, so time-
      // /focus-/reconnect-based revalidation is unnecessary. refetchOnMount
      // stays at its library default (true) so that a query a mutation just
      // invalidateQueries()'d — even one for a currently-unmounted screen —
      // refetches the next time that screen mounts, instead of serving
      // stale cached data forever.
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingMs: 200,
  defaultPendingMinMs: 200,
  defaultPendingComponent: FullScreenLoader,
  context: {
    queryClient,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }

  interface HistoryState {
    mediaPreview?: MediaRecord;
  }
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <Notifications />
        <ModalsProvider>
          <RouterProvider router={router} />
        </ModalsProvider>
      </AppThemeProvider>
    </QueryClientProvider>,
  );
}
