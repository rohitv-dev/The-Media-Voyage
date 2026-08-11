import { AppShell } from "@mantine/core";
import {
  useDisclosure,
  useHotkeys,
  useLocalStorage,
  useMediaQuery,
} from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { collectionQueryOptions } from "#/features/media-collection/queries";
import { sessionQueryKey, sessionQueryOptions } from "#/auth/session";
import { authClient } from "#/auth/authClient";
import { ShortcutsHelpModal } from "#/components/ShortcutsHelpModal";
import { AuthenticatedHeader } from "#/features/app-shell/components/AuthenticatedHeader";
import { AuthenticatedSidebar } from "#/features/app-shell/components/AuthenticatedSidebar";
import { CommandPalette } from "#/features/app-shell/components/CommandPalette";
import type { AppShellPath } from "#/features/app-shell/navigation";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const cachedSession = queryClient.getQueryData(sessionQueryKey);
    // A temporary empty session result must not stay cached indefinitely after
    // the backend recovers. Valid sessions retain the global infinite cache.
    const session =
      cachedSession === null
        ? await queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: 0 })
        : await queryClient.ensureQueryData(sessionQueryOptions);

    if (!session) {
      throw redirect({ to: "/auth/login" });
    }

    // Exposed to child routes so forms can read account preferences (e.g.
    // defaultVisibility) synchronously, without a session-loading flicker.
    return { session };
  },
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(collectionQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <AuthenticatedShell />;
}

function AuthenticatedShell() {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const [navbarOpened, { toggle: toggleNavbar, close: closeNavbar }] =
    useDisclosure();
  const [sidebarOpened, setSidebarOpened] = useLocalStorage<boolean>({
    key: "media-voyage-sidebar-opened",
    defaultValue: true,
  });
  const isDesktop = useMediaQuery("(min-width: 62em)");
  const railCollapsed = isDesktop && !sidebarOpened;

  const [shortcutsOpened, { open: openShortcuts, close: closeShortcuts }] =
    useDisclosure();
  const [
    commandPaletteOpened,
    {
      open: openCommandPalette,
      close: closeCommandPalette,
      toggle: toggleCommandPalette,
    },
  ] = useDisclosure();

  useHotkeys([
    [
      "/",
      (event) => {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>('[data-shortcut="library-search"]')
          ?.focus();
      },
    ],
    ["c", () => navigate({ to: "/media/add" })],
    [
      "r",
      () =>
        document
          .querySelector<HTMLButtonElement>('[data-shortcut="reset-filters"]')
          ?.click(),
    ],
    [
      "?",
      (event) => {
        event.preventDefault();
        openShortcuts();
      },
    ],
    ["mod+K", toggleCommandPalette],
  ]);

  const logout = async () => {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    navigate({ to: "/auth/login" });
  };

  const navigateSidebar = (path: AppShellPath) => {
    navigate({ to: path });
    closeNavbar();
  };

  const navigateToCollection = (collectionId: string) => {
    navigate({
      to: "/collection/view/$id",
      params: { id: collectionId },
    });
    closeNavbar();
  };

  const addMedia = () => navigate({ to: "/media/add" });
  const openProfile = () => navigate({ to: "/profile" });
  const openMedia = (userMediaId: string) =>
    navigate({ to: "/media/view/$id", params: { id: userMediaId } });
  const openSemanticSearch = () =>
    navigate({
      to: "/media",
      search: (previous) => previous,
      state: (previous) => ({
        ...previous,
        semanticSearchFocusRequest: Date.now(),
      }),
    });
  const openFriends = () => navigate({ to: "/friends" });

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{
        width: railCollapsed ? 76 : 260,
        breakpoint: "md",
        collapsed: { mobile: !navbarOpened },
      }}
    >
      <AuthenticatedHeader
        navbarOpened={navbarOpened}
        sidebarOpened={sidebarOpened}
        onToggleNavbar={toggleNavbar}
        onToggleSidebar={() => setSidebarOpened((value) => !value)}
        onGoHome={() => navigate({ to: "/media" })}
        onOpenNotificationsPage={() => navigateSidebar("/notifications")}
        onOpenMedia={openMedia}
        onOpenFriends={openFriends}
        onOpenShortcuts={openShortcuts}
        onOpenCommandPalette={openCommandPalette}
        onAddMedia={addMedia}
        onOpenProfile={openProfile}
      />

      <AuthenticatedSidebar
        railCollapsed={railCollapsed}
        onNavigate={navigateSidebar}
        onNavigateToCollection={navigateToCollection}
        onLogout={logout}
      />

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <ShortcutsHelpModal opened={shortcutsOpened} onClose={closeShortcuts} />
      <CommandPalette
        opened={commandPaletteOpened}
        onClose={closeCommandPalette}
        onNavigate={navigateSidebar}
        onOpenMedia={openMedia}
        onOpenSemanticSearch={openSemanticSearch}
      />
    </AppShell>
  );
}
