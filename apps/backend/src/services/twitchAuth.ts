import { env } from "../config";

let accessToken: string | null = null;
let expiresAt = 0;

async function fetchAccessToken() {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${env.IGDB_CLIENT_ID}&client_secret=${env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to obtain Twitch access token");
  }

  const data: {
    access_token: string;
    expires_in: number;
  } = await response.json();

  accessToken = data.access_token;

  // Refresh one minute early
  expiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return accessToken;
}

export async function getAccessToken() {
  if (!accessToken || Date.now() >= expiresAt) {
    return fetchAccessToken();
  }

  return accessToken;
}
