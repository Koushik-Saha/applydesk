import { NextResponse } from "next/server";
import { requireOwner } from "../auth/require-owner";
import { toErrorResponse } from "./api-error";

// Shared route handler shape (CLAUDE.md): authorize -> call a service ->
// return typed JSON, converting AuthError/ZodError into `{ error }` JSON.
export async function withOwner(
  handler: (ownerId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const session = await requireOwner();
    return await handler(session.user.id);
  } catch (error) {
    return toErrorResponse(error);
  }
}
