import { NextResponse } from "next/server";
import { AuthError } from "../auth/errors";

// Route handler shape (CLAUDE.md): parse -> authorize -> call a service ->
// return typed JSON, with `{ error: { code, message } }` on failure.
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  throw error;
}
