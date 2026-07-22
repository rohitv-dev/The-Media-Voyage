import "dotenv/config";
import { z } from "zod";

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
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
  IGDB_CLIENT_ID: z.string().min(1, "IGDB_CLIENT_ID is required"),
  IGDB_CLIENT_SECRET: z.string().min(1, "IGDB_CLIENT_SECRET is required"),
  OMDB_API_KEY: z.string().min(1, "OMDB_API_KEY is required"),
  SIGNUP_INVITE_CODE: z.string().min(1).optional(),
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

if (environment.NODE_ENV === "production") {
  if (betterAuthUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production");
  }

  if (!frontendOrigin.startsWith("https://")) {
    throw new Error("FRONTEND_URL must use HTTPS in production");
  }

  if (!environment.SIGNUP_INVITE_CODE) {
    throw new Error(
      "SIGNUP_INVITE_CODE is required in production to keep signup from being wide open",
    );
  }
}

export const env = {
  ...environment,
  BETTER_AUTH_URL: betterAuthUrl.origin,
  FRONTEND_ORIGIN: frontendOrigin,
  isProduction: environment.NODE_ENV === "production",
};
