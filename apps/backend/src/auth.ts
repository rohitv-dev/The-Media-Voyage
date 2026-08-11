import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@media-voyage/shared/schema";
import { db } from "./db/db";
import { env } from "./config";
import { nanoid } from "nanoid";

const oneHour = 60 * 60;
const oneDay = 60 * 60 * 24;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
    additionalFields: {
      defaultVisibility: {
        type: "string",
        required: false,
        defaultValue: "private",
      },
      publicId: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
    },
  },
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: oneHour,
    },
    expiresIn: oneDay * 30,
    updateAge: oneDay,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const publicId = nanoid(12);
          return {
            data: {
              ...user,
              publicId,
            },
          };
        },
      },
    },
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
  trustedOrigins: env.TRUSTED_ORIGINS,
});
