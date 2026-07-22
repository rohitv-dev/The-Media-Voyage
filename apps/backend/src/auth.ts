import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@media-voyage/shared/schema";
import { db } from "./db/db";
import { env } from "./config";

const oneDay = 60 * 60 * 24;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  session: {
    expiresIn: oneDay * 30,
    updateAge: oneDay,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      // No code configured (dev default) means the gate is off.
      if (!env.SIGNUP_INVITE_CODE) return;

      const providedCode = ctx.headers?.get("x-invite-code");
      if (providedCode !== env.SIGNUP_INVITE_CODE) {
        throw new APIError("UNAUTHORIZED", {
          message: "Invalid invite code",
        });
      }
    }),
  },
  advanced: {
    disableOriginCheck: !env.isProduction,
    useSecureCookies: env.isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: env.AUTH_COOKIE_SAME_SITE,
      ...(env.isProduction ? { secure: true } : {}),
      ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
    },
  },
  trustedOrigins: [env.FRONTEND_ORIGIN],
});
