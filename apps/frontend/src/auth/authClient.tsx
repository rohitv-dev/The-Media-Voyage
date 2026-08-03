import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { frontendConfig } from "../config";

export const authClient = createAuthClient({
  baseURL: frontendConfig.authBaseUrl,
  plugins: [
    // Mirrors `user.additionalFields` in the backend auth config so the
    // session and authenticated user updates stay correctly typed.
    inferAdditionalFields({
      user: {
        // `required: false` keeps it out of the sign-up payload.
        defaultVisibility: { type: "string", required: false },
        publicId: { type: "string", required: false },
      },
    }),
  ],
});
