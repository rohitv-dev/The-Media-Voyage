import { Box, Group, Loader, Text, UnstyledButton } from "@mantine/core";
import {
  IconCheck,
  IconDots,
  IconHome2,
  IconPlus,
  IconStar,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { mobilePrimaryNavigationItems } from "#/features/app-shell/navigation";
import type { AppShellPath } from "#/features/app-shell/navigation";
import {
  ADD_MEDIA_FORM_ID,
  getUpdateMediaFormId,
} from "#/features/media/components/MediaForm/context";
import type { MediaFormStatus } from "#/features/media/components/MediaForm/context";

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
      h={64}
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
      <Icon size={23} stroke={active ? 2.2 : 1.8} />
      <Text component="span" c="inherit" fz={11} fw={active ? 700 : 500}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

interface MediaActionButtonProps {
  label: "Add" | "Save" | "Update";
  formId?: string;
  formStatus?: MediaFormStatus | null;
  onClick: () => void;
}

function MediaActionButton({
  label,
  formId,
  formStatus,
  onClick,
}: MediaActionButtonProps) {
  const isSubmit = formId !== undefined;
  const formReady = isSubmit && formStatus?.formId === formId;
  const isPending = formReady && formStatus?.isPending === true;
  const disabled = isSubmit && (!formReady || isPending);

  return (
    <UnstyledButton
      type={isSubmit ? "submit" : "button"}
      form={formId}
      aria-label={isSubmit ? `${label} media` : label}
      aria-busy={isPending || undefined}
      data-tutorial={
        isSubmit ? "media-save-mobile" : "dashboard-add-media-mobile"
      }
      disabled={disabled}
      c="accent"
      h={64}
      onClick={isSubmit ? undefined : onClick}
      pos="relative"
      style={{
        alignItems: "center",
        borderRadius: "var(--mantine-radius-md)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        minWidth: 44,
        opacity: disabled ? 0.6 : 1,
        overflow: "visible",
        paddingBottom: 6,
      }}
    >
      <Box
        bg="accent"
        c="white"
        h={52}
        pos="absolute"
        top={-22}
        w={52}
        style={{
          alignItems: "center",
          border: "4px solid var(--mantine-color-default)",
          borderRadius: "50%",
          boxShadow: "var(--mantine-shadow-sm)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {isPending ? (
          <Loader size={24} color="white" />
        ) : isSubmit ? (
          <IconCheck size={26} stroke={2.1} />
        ) : (
          <IconPlus size={26} stroke={2.1} />
        )}
      </Box>
      <Text component="span" c="inherit" fz={11} fw={700}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

interface MobileBottomNavigationProps {
  mediaFormStatus?: MediaFormStatus | null;
  navbarOpened: boolean;
  pathname: string;
  onNavigate: (path: AppShellPath) => void;
  onToggleMore: () => void;
}

export function MobileBottomNavigation({
  mediaFormStatus,
  navbarOpened,
  pathname,
  onNavigate,
  onToggleMore,
}: MobileBottomNavigationProps) {
  const addActive = /^\/media\/add\/?$/i.test(pathname);
  const updateId = /^\/media\/update\/([^/]+)\/?$/i.exec(pathname)?.[1];
  const formId = updateId
    ? getUpdateMediaFormId(updateId)
    : addActive
      ? ADD_MEDIA_FORM_ID
      : undefined;
  const libraryActive =
    !!updateId ||
    pathname === "/media" ||
    (pathname.startsWith("/media/") && !addActive);
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
      className="mobile-bottom-navigation"
      data-tutorial="dashboard-navigation-mobile"
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
      <Group align="flex-end" gap={0} grow h={64} px={4} wrap="nowrap">
        {mobilePrimaryNavigationItems.slice(0, 2).map((item) => {
          const Icon = item.path === "/dashboard" ? IconHome2 : item.icon;
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

        <MediaActionButton
          label={updateId ? "Update" : addActive ? "Save" : "Add"}
          formId={formId}
          formStatus={mediaFormStatus}
          onClick={() => onNavigate("/media/add")}
        />

        {mobilePrimaryNavigationItems.slice(2).map((item) => {
          const Icon = item.path === "/recommendations" ? IconStar : item.icon;
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
