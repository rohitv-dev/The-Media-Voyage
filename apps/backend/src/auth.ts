import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@media-voyage/shared/schema";
import { db } from "./db/db";
import { env } from "./config";

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
