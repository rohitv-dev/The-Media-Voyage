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
import { createTheme, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import type { MediaRecord } from "@media-voyage/shared/api";
import { FullScreenLoader } from "#/components/FullScreenLoader";

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

const theme = createTheme({
  primaryColor: "indigo",

  radius: {
    xs: "6px",
    sm: "10px",
    md: "14px",
    lg: "18px",
    xl: "24px",
  },

  spacing: {
    xs: "6px",
    sm: "10px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },

  defaultRadius: "md",

  shadows: {
    xs: "0 1px 2px rgba(16,24,40,.04)",
    sm: "0 2px 8px rgba(16,24,40,.05)",
    md: "0 4px 12px rgba(16,24,40,.06)",
    lg: "0 8px 24px rgba(16,24,40,.08)",
  },

  components: {
    Checkbox: {
      defaultProps: {
        radius: "xs",
      },
    },
  },
});

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light" theme={theme}>
        <Notifications />
        <ModalsProvider>
          <RouterProvider router={router} />
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
}
