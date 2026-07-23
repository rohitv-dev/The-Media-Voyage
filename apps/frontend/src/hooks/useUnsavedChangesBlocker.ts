import { useBlocker } from "@tanstack/react-router";
import { useCallback, useRef } from "react";

export function useUnsavedChangesBlocker(isDirty: () => boolean) {
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const shouldBlockFn = useCallback(() => {
    if (!isDirtyRef.current()) return false;

    return !window.confirm(
      "You have unsaved changes. Leave this page and discard them?",
    );
  }, []);

  useBlocker({
    shouldBlockFn,
    enableBeforeUnload: true,
  });
}
