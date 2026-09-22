import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "../auth/errors";

// Route handler shape (CLAUDE.md): parse -> authorize -> call a service ->
// return typed JSON, with `{ error: { code, message } }` on failure.
export function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return jsonError(error.code, error.message, error.status);
  }
  if (error instanceof ZodError) {
    const detail = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    return jsonError("invalid_input", `Invalid request body: ${detail}`, 400);
  }
  throw error;
}
