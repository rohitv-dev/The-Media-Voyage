import { queryOptions } from "@tanstack/react-query";
import { authClient } from "./authClient";

const RETRY_ATTEMPTS = 8;
const RETRY_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const sessionQueryKey = ["session"] as const;

// staleTime: Infinity (inherited from the global default) means this only
// re-fetches on invalidation, so route beforeLoad no longer pays a fresh
// India<->Europe round trip on every navigation — just on the first load and
// whenever login/logout invalidates it.
export const sessionQueryOptions = queryOptions({
  queryKey: sessionQueryKey,
  queryFn: getSession,
});

async function getSession() {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await authClient.getSession();

    if (!error) return data;

    // Only a definitive 401 means the session is actually gone. Anything
    // else (backend still booting in dev, proxy 5xx, network failure) must
    // not be treated as logged out — retry, then surface the error instead
    // of silently bouncing the user to the login page.
    if (error.status === 401) return null;

    if (attempt < RETRY_ATTEMPTS) {
      await delay(RETRY_DELAY_MS);
    }
  }

  throw new Error(
    "Unable to reach the server to verify your session. Is the backend running?",
  );
}
