import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@media-voyage/shared/schema";
import { db } from "./db/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    disableOriginCheck: true, // Disable origin check for development; enable in production
  },
  trustedOrigins: ["http://localhost:4000"],
});
