import { NextResponse } from "next/server";
import { requireOwnerOrExtensionToken } from "../auth/require-any";
import { toErrorResponse } from "./api-error";

export async function withAnyAuth(
  request: Request,
  handler: (ownerId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const { ownerId } = await requireOwnerOrExtensionToken(request);
    return await handler(ownerId);
  } catch (error) {
    return toErrorResponse(error);
  }
}
