import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ quiet: true });
loadEnv({ path: "apps/backend/.env", quiet: true });

const isProduction = process.env.NODE_ENV === "production";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z
    .string()
    .min(1)
    .default(isProduction ? "0.0.0.0" : "127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url("DATABASE_URL must be a valid PostgreSQL URL"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL"),
  FRONTEND_URL: z.url("FRONTEND_URL must be a valid URL"),
  MOBILE_FRONTEND_URL: z
    .url("MOBILE_FRONTEND_URL must be a valid URL")
    .optional(),
  DEV_TRUSTED_ORIGIN: z
    .url("DEV_TRUSTED_ORIGIN must be a valid URL")
    .optional(),
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
  IGDB_CLIENT_ID: z.string().min(1, "IGDB_CLIENT_ID is required"),
  IGDB_CLIENT_SECRET: z.string().min(1, "IGDB_CLIENT_SECRET is required"),
  TMDB_API_READ_ACCESS_TOKEN: z
    .string()
    .min(1, "TMDB_API_READ_ACCESS_TOKEN is required"),
  OPEN_LIBRARY_CONTACT_EMAIL: z.email().optional(),
});

const parsedEnvironment = environmentSchema.safeParse({
  ...process.env,
  HOST: process.env.HOST ?? (isProduction ? "0.0.0.0" : "127.0.0.1"),
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    (isProduction
      ? undefined
      : "media-voyage-development-secret-please-change"),
  BETTER_AUTH_URL:
    process.env.BETTER_AUTH_URL ??
    (isProduction ? undefined : "http://localhost:3000"),
  FRONTEND_URL:
    process.env.FRONTEND_URL ??
    (isProduction ? undefined : "http://localhost:4000"),
  AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN || undefined,
  DEV_TRUSTED_ORIGIN: process.env.DEV_TRUSTED_ORIGIN || undefined,
  OPEN_LIBRARY_CONTACT_EMAIL:
    process.env.OPEN_LIBRARY_CONTACT_EMAIL || undefined,
});

if (!parsedEnvironment.success) {
  const issues = parsedEnvironment.error.issues
    .map(
      (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
    )
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const environment = parsedEnvironment.data;
const betterAuthUrl = new URL(environment.BETTER_AUTH_URL);
const frontendOrigin = new URL(environment.FRONTEND_URL).origin;
const mobileFrontendOrigin = environment.MOBILE_FRONTEND_URL
  ? new URL(environment.MOBILE_FRONTEND_URL).origin
  : undefined;
const developmentTrustedOrigin =
  environment.NODE_ENV === "development" && environment.DEV_TRUSTED_ORIGIN
    ? new URL(environment.DEV_TRUSTED_ORIGIN).origin
    : undefined;
const trustedOrigins = [
  frontendOrigin,
  mobileFrontendOrigin,
  developmentTrustedOrigin,
].filter((origin): origin is string => Boolean(origin));

if (environment.NODE_ENV === "production") {
  if (betterAuthUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production");
  }

  if (!frontendOrigin.startsWith("https://")) {
    throw new Error("FRONTEND_URL must use HTTPS in production");
  }

  if (mobileFrontendOrigin && !mobileFrontendOrigin.startsWith("https://")) {
    throw new Error("MOBILE_FRONTEND_URL must use HTTPS in production");
  }
}

export const env = {
  ...environment,
  BETTER_AUTH_URL: betterAuthUrl.origin,
  FRONTEND_ORIGIN: frontendOrigin,
  TRUSTED_ORIGINS: trustedOrigins,
  isProduction: environment.NODE_ENV === "production",
};
