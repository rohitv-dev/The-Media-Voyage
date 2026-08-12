import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import { IconDots, IconPlus } from "@tabler/icons-react";
import type { ComponentType } from "react";
import { mobilePrimaryNavigationItems } from "#/features/app-shell/navigation";
import type { AppShellPath } from "#/features/app-shell/navigation";

const mobileLabels = {
  "/dashboard": "Home",
  "/media": "Library",
  "/recommendations": "For you",
} as const;

interface MobileNavigationButtonProps {
  active: boolean;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  label: string;
  onClick: () => void;
}

function MobileNavigationButton({
  active,
  icon: Icon,
  label,
  onClick,
}: MobileNavigationButtonProps) {
  return (
    <UnstyledButton
      aria-current={active ? "page" : undefined}
      aria-label={label}
      c={active ? "accent" : "dimmed"}
      h={56}
      onClick={onClick}
      style={{
        alignItems: "center",
        borderRadius: "var(--mantine-radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        justifyContent: "center",
        minWidth: 44,
      }}
    >
      <Icon size={22} stroke={active ? 2.2 : 1.8} />
      <Text component="span" c="inherit" fz={10} fw={active ? 700 : 500}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

interface AddMediaButtonProps {
  active: boolean;
  onClick: () => void;
}

function AddMediaButton({ active, onClick }: AddMediaButtonProps) {
  return (
    <UnstyledButton
      aria-current={active ? "page" : undefined}
      aria-label="Add"
      c="accent"
      h={56}
      onClick={onClick}
      pos="relative"
      style={{
        alignItems: "center",
        borderRadius: "var(--mantine-radius-md)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        minWidth: 44,
        overflow: "visible",
        paddingBottom: 5,
      }}
    >
      <Box
        bg="accent"
        c="white"
        h={48}
        pos="absolute"
        top={-20}
        w={48}
        style={{
          alignItems: "center",
          border: "4px solid var(--mantine-color-default)",
          borderRadius: "50%",
          boxShadow: "var(--mantine-shadow-sm)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <IconPlus size={23} stroke={2.2} />
      </Box>
      <Text component="span" c="inherit" fz={10} fw={700}>
        Add
      </Text>
    </UnstyledButton>
  );
}

interface MobileBottomNavigationProps {
  navbarOpened: boolean;
  pathname: string;
  onNavigate: (path: AppShellPath) => void;
  onToggleMore: () => void;
}

export function MobileBottomNavigation({
  navbarOpened,
  pathname,
  onNavigate,
  onToggleMore,
}: MobileBottomNavigationProps) {
  const addActive = pathname === "/media/add";
  const libraryActive =
    pathname === "/media" || (pathname.startsWith("/media/") && !addActive);
  const homeActive = pathname === "/dashboard";
  const recommendationsActive = pathname.startsWith("/recommendations");
  const primaryRouteActive =
    homeActive || libraryActive || addActive || recommendationsActive;
  const moreActive = navbarOpened || !primaryRouteActive;

  const isPrimaryItemActive = (path: AppShellPath) => {
    if (navbarOpened) return false;
    if (path === "/dashboard") return homeActive;
    if (path === "/media") return libraryActive;
    if (path === "/recommendations") return recommendationsActive;
    return false;
  };

  return (
    <Box
      component="nav"
      aria-label="Primary navigation"
      hiddenFrom="sm"
      pos="fixed"
      bg="var(--mantine-color-default)"
      bottom={0}
      left={0}
      right={0}
      style={{
        borderTop: "1px solid var(--mantine-color-default-border)",
        borderTopLeftRadius: "var(--mantine-radius-xl)",
        borderTopRightRadius: "var(--mantine-radius-xl)",
        boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.18)",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 300,
      }}
    >
      <Group align="flex-end" gap={0} grow h={56} px={4} wrap="nowrap">
        {mobilePrimaryNavigationItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return (
            <MobileNavigationButton
              key={item.path}
              active={isPrimaryItemActive(item.path)}
              icon={Icon}
              label={mobileLabels[item.path]}
              onClick={() => onNavigate(item.path)}
            />
          );
        })}

        <AddMediaButton
          active={!navbarOpened && addActive}
          onClick={() => onNavigate("/media/add")}
        />

        {mobilePrimaryNavigationItems.slice(2).map((item) => {
          const Icon = item.icon;
          return (
            <MobileNavigationButton
              key={item.path}
              active={isPrimaryItemActive(item.path)}
              icon={Icon}
              label={mobileLabels[item.path]}
              onClick={() => onNavigate(item.path)}
            />
          );
        })}

        <MobileNavigationButton
          active={moreActive}
          icon={IconDots}
          label="More"
          onClick={onToggleMore}
        />
      </Group>
    </Box>
  );
}
