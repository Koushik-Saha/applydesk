import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireExtensionToken } from "@/lib/auth/require-extension-token";
import { AuthError } from "@/lib/auth/errors";
import { jsonError } from "./api-error";

export async function withExtensionToken<T>(
  request: Request,
  handler: (auth: { ownerId: string; tokenId: string }) => Promise<NextResponse<T> | Response>,
): Promise<Response> {
  try {
    const auth = await requireExtensionToken(request);
    return await handler(auth);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.code, err.message, err.status);
    }
    if (err instanceof ZodError) {
      const detail = err.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      return jsonError("validation_error", `Invalid request body: ${detail}`, 400);
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonError("server_error", message, 500);
  }
}
