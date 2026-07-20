import { createAuthClient } from "better-auth/react";
import { frontendConfig } from "../config";

export const authClient = createAuthClient({
  baseURL: frontendConfig.authBaseUrl,
});
