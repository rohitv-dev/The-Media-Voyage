import { authClient } from "#/auth/authClient";
import { sessionQueryKey, sessionQueryOptions } from "#/auth/session";
import { getApiErrorMessage } from "#/lib/api";
import { showErrorNotification } from "#/lib/notifications";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Driver } from "driver.js";
import {
  createTutorialDriver,
  getNextTutorialProgress,
  isTutorialSeen,
  normalizeTutorialProgress,
  shouldStartTutorial,
} from "./tutorialDefinitions";
import type { TutorialId, TutorialProgress } from "./tutorialDefinitions";

// ponytail: one global tour queue prevents stacked overlays; split queues only
// matter if the app grows multiple independently mounted shells.
let activeTutorialDriver: Driver | null = null;
const pendingTutorialStarts: Array<() => void> = [];

function enqueueTutorialStart(start: () => void) {
  let cancelled = false;
  const begin = () => {
    if (!cancelled) start();
  };

  if (activeTutorialDriver?.isActive()) {
    pendingTutorialStarts.push(begin);
  } else {
    begin();
  }

  return () => {
    cancelled = true;
    const index = pendingTutorialStarts.indexOf(begin);
    if (index >= 0) pendingTutorialStarts.splice(index, 1);
  };
}

function releaseTutorialDriver(driver: Driver) {
  if (activeTutorialDriver !== driver) return;

  activeTutorialDriver = null;
  const next = pendingTutorialStarts.shift();
  if (next) queueMicrotask(next);
}

type UseTutorialOptions = {
  enabled?: boolean;
  canSync?: boolean;
};

export function useTutorial(
  id: TutorialId,
  { enabled = true, canSync = false }: UseTutorialOptions = {},
) {
  const reduceMotion = useAppReducedMotion();
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions);
  const storedProgress = session?.user.tutorialProgress;
  const progress = useMemo(
    () => normalizeTutorialProgress(storedProgress),
    [storedProgress],
  );
  const progressRef = useRef<TutorialProgress>({});
  const initializedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const driverRef = useRef<Driver | null>(null);
  const pendingStartRef = useRef<(() => void) | null>(null);
  const [progressReady, setProgressReady] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!session) return;

    progressRef.current = progress;
    if (initializedRef.current) return;

    initializedRef.current = true;
    setSeen(isTutorialSeen(id, progress));
    setProgressReady(true);
  }, [id, progress, session]);

  const completeTutorial = useCallback(
    (persist: boolean) => {
      setSeen(true);
      if (!persist) return;

      const nextProgress = getNextTutorialProgress(progressRef.current, id);
      progressRef.current = nextProgress;

      void (async () => {
        let requestError: unknown;

        try {
          const result = await authClient.updateUser({
            tutorialProgress: nextProgress,
          });

          if (result.error) {
            requestError = new Error(result.error.message);
          }
        } catch (error) {
          requestError = error;
        }

        try {
          await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
        } catch (error) {
          requestError ??= error;
        }

        if (requestError) {
          showErrorNotification({
            message: getApiErrorMessage(
              requestError,
              "Could not save tutorial progress",
            ),
          });
        }
      })();
    },
    [id, queryClient],
  );

  const startTutorial = useCallback(
    (persist: boolean) => {
      if (!session || (persist && (!progressReady || seen))) return undefined;
      if (driverRef.current?.isActive() || pendingStartRef.current) {
        return undefined;
      }

      let cancelled = false;
      let cancel = () => {};
      const cancelAndClear = () => {
        cancelled = true;
        cancel();
        if (pendingStartRef.current === cancelAndClear) {
          pendingStartRef.current = null;
        }
      };

      pendingStartRef.current = cancelAndClear;
      cancel = enqueueTutorialStart(() => {
        pendingStartRef.current = null;
        if (cancelled) return;

        let didComplete = false;
        const tutorialDriver = createTutorialDriver(id, {
          canSync,
          reduceMotion,
          onDestroyed: () => {
            if (!didComplete) {
              didComplete = true;
              completeTutorial(persist);
            }
            if (driverRef.current === tutorialDriver) {
              driverRef.current = null;
            }
            releaseTutorialDriver(tutorialDriver);
          },
        });

        driverRef.current = tutorialDriver;
        activeTutorialDriver = tutorialDriver;
        tutorialDriver.drive();
      });

      return cancelAndClear;
    },
    [canSync, completeTutorial, id, progressReady, reduceMotion, seen, session],
  );

  const start = useCallback(() => {
    void startTutorial(false);
  }, [startTutorial]);

  useEffect(() => {
    if (
      !enabled ||
      !session ||
      !progressReady ||
      !shouldStartTutorial(id, progress, false) ||
      autoStartedRef.current
    ) {
      return;
    }

    autoStartedRef.current = true;
    const cancel = startTutorial(true);
    return () => cancel?.();
  }, [enabled, id, progress, progressReady, session, startTutorial]);

  useEffect(
    () => () => {
      pendingStartRef.current?.();
      pendingStartRef.current = null;
      if (driverRef.current?.isActive()) driverRef.current.destroy();
    },
    [],
  );

  return { start };
}
