import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "mantine-datatable/styles.css";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  context: {
    queryClient,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        defaultColorScheme="light"
        theme={{
          primaryColor: "blue",

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
        }}
      >
        <Notifications />
        <RouterProvider router={router} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}
