function getConfiguredApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (!configuredUrl) {
    if (import.meta.env.PROD) {
      throw new Error("VITE_API_URL must be configured for production builds");
    }

    return new URL("/api/v1", window.location.origin);
  }

  return new URL(configuredUrl, window.location.origin);
}

function normalizeUrl(url: URL) {
  if (url.search || url.hash) {
    throw new Error(
      "Configured API URLs must not include a query string or hash",
    );
  }

  url.pathname = url.pathname.replace(/\/$/, "");
  return url;
}

const apiUrl = normalizeUrl(getConfiguredApiUrl());
const configuredAuthUrl = import.meta.env.VITE_AUTH_URL?.trim();
const authUrl = configuredAuthUrl
  ? normalizeUrl(new URL(configuredAuthUrl, window.location.origin))
  : new URL(apiUrl.origin);

export const frontendConfig = {
  apiBaseUrl: apiUrl.toString().replace(/\/$/, ""),
  authBaseUrl: authUrl.origin,
};
