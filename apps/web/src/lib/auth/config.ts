import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db/client";
import * as schema from "../db/schema";
import { isOwnerEmail } from "./allowlist";

// CLAUDE.md rule 5 / PROJECT_SPEC.md §10 — Google sign-in only, single-email
// allowlist. `validateUserInfo` runs on both first sign-up and every
// returning OAuth sign-in, so a non-owner is rejected every time, not just
// once at account creation.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  emailAndPassword: { enabled: false },
  user: {
    validateUserInfo: async ({ user }) => {
      if (!isOwnerEmail(user.email)) {
        return { error: "not_owner", errorDescription: "This site is private." };
      }
    },
  },
  onAPIError: {
    errorURL: "/login",
  },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [nextCookies()],
});
