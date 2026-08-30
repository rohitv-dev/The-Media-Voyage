import { AppShell } from "@mantine/core";
import {
  useDisclosure,
  useHotkeys,
  useLocalStorage,
  useMediaQuery,
} from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { sessionQueryKey, sessionQueryOptions } from "#/auth/session";
import { authClient } from "#/auth/authClient";
import { ShortcutsHelpModal } from "#/components/ShortcutsHelpModal";
import { AuthenticatedHeader } from "#/features/app-shell/components/AuthenticatedHeader";
import { AuthenticatedSidebar } from "#/features/app-shell/components/AuthenticatedSidebar";
import { CommandPalette } from "#/features/app-shell/components/CommandPalette";
import { MobileBottomNavigation } from "#/features/app-shell/components/MobileBottomNavigation";
import { MobileMoreDrawer } from "#/features/app-shell/components/MobileMoreDrawer";
import {
  clearPushNotificationToken,
  usePushNotifications,
} from "#/features/notifications/hooks/usePushNotifications";
import type { PushNotificationData } from "#/features/notifications/hooks/usePushNotifications";
import { openRecommendationModal } from "#/features/recommendations/components/ContextModal";
import type { AppShellPath } from "#/features/app-shell/navigation";
import { useCallback } from "react";

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
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const { session } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const openNotifications = useCallback(
    (data: PushNotificationData) => {
      if (data.type === "friend_recommendation" && data.recommendationId) {
        openRecommendationModal(data.recommendationId);
        return;
      }

      if (data.type === "friend_request") {
        navigate({ to: "/friends" });
        return;
      }

      navigate({ to: "/notifications" });
    },
    [navigate],
  );

  usePushNotifications(session.user.id, openNotifications);

  const [navbarOpened, { toggle: toggleNavbar, close: closeNavbar }] =
    useDisclosure();
  const [sidebarOpened, setSidebarOpened] = useLocalStorage<boolean>({
    key: "media-voyage-sidebar-opened",
    defaultValue: true,
  });
  const isDesktop = useMediaQuery("(min-width: 62em)");
  const isPhone = useMediaQuery("(max-width: 47.99em)", undefined, {
    getInitialValueInEffect: false,
  });
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
    await clearPushNotificationToken();
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    navigate({ to: "/auth/login" });
  };

  const navigateSidebar = (path: AppShellPath) => {
    navigate({ to: path });
    closeNavbar();
  };

  const addMedia = () => {
    closeNavbar();
    navigate({ to: "/media/add" });
  };
  const goHome = () => {
    closeNavbar();
    navigate({ to: "/dashboard" });
  };
  const openProfile = () => navigate({ to: "/profile" });
  const openMedia = (userMediaId: string) =>
    navigate({ to: "/media/view/$id", params: { id: userMediaId } });
  const openLibrarySearch = () =>
    navigate({
      to: "/media",
      search: (previous) => previous,
      state: (previous) => ({
        ...previous,
        librarySearchFocusRequest: Date.now(),
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
        onGoHome={goHome}
        onOpenNotificationsPage={() => navigateSidebar("/notifications")}
        onOpenMedia={openMedia}
        onOpenFriends={openFriends}
        onOpenShortcuts={openShortcuts}
        onOpenCommandPalette={openCommandPalette}
        onAddMedia={addMedia}
        onOpenProfile={openProfile}
      />

      {isPhone ? (
        <MobileMoreDrawer
          opened={navbarOpened}
          pathname={pathname}
          userName={session.user.name}
          onClose={closeNavbar}
          onNavigate={navigateSidebar}
          onLogout={logout}
        />
      ) : (
        <AuthenticatedSidebar
          railCollapsed={railCollapsed}
          onNavigate={navigateSidebar}
          onLogout={logout}
        />
      )}

      <AppShell.Main
        pb={{
          base: "calc(86px + env(safe-area-inset-bottom))",
          sm: 0,
        }}
      >
        <Outlet />
      </AppShell.Main>

      <MobileBottomNavigation
        navbarOpened={navbarOpened}
        pathname={pathname}
        onNavigate={navigateSidebar}
        onToggleMore={toggleNavbar}
      />

      <ShortcutsHelpModal opened={shortcutsOpened} onClose={closeShortcuts} />
      <CommandPalette
        opened={commandPaletteOpened}
        onClose={closeCommandPalette}
        onNavigate={navigateSidebar}
        onOpenMedia={openMedia}
        onOpenLibrarySearch={openLibrarySearch}
      />
    </AppShell>
  );
}
