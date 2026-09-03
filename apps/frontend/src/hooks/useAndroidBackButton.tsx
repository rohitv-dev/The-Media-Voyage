import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useEffect, useRef } from "react";

export function useAndroidBackButton(
  drawerOpened: boolean,
  closeDrawer: () => void,
) {
  const drawerOpenedRef = useRef(drawerOpened);
  drawerOpenedRef.current = drawerOpened;

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    const listener = App.addListener("backButton", ({ canGoBack }) => {
      if (document.querySelector('[role="dialog"]')) {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            bubbles: true,
          }),
        );
        return;
      }

      if (drawerOpenedRef.current) {
        closeDrawer();
        return;
      }

      if (canGoBack) {
        window.history.back();
        return;
      }

      modals.openConfirmModal({
        title: "Leave Media Voyage?",
        children: (
          <Text size="sm">Are you sure you want to leave the app?</Text>
        ),
        labels: { confirm: "Leave", cancel: "Stay" },
        confirmProps: { color: "red" },
        onConfirm: () => void App.exitApp(),
      });
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [closeDrawer]);
}
