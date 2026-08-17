import { queryOptions } from "@tanstack/react-query";
import { authClient } from "./authClient";

export const sessionQueryKey = ["session"] as const;

// staleTime: Infinity (inherited from the global default) means this only
// re-fetches on invalidation, so route beforeLoad no longer pays a fresh
// India<->Europe round trip on every navigation — just on the first load and
// whenever login/logout invalidates it.
export const sessionQueryOptions = queryOptions({
  queryKey: sessionQueryKey,
  queryFn: getSession,
  retry: 7,
  retryDelay: 1000,
});

async function getSession() {
  const { data, error } = await authClient.getSession();

  if (!error) return data;

  // Only a definitive 401 means the session is actually gone. Anything
  // else (backend still booting in dev, proxy 5xx, network failure) must
  // not be treated as logged out — let TanStack Query retry, then surface
  // the error instead of silently bouncing the user to the login page.
  if (error.status === 401) return null;

  throw new Error(
    "Unable to reach the server to verify your session. Is the backend running?",
  );
}
