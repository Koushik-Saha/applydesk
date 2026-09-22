"use client";

import { createAuthClient } from "better-auth/react";

// No baseURL: the client defaults to same-origin, and /api/auth lives on
// this same Next.js app.
export const authClient = createAuthClient();
