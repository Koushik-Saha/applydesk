import { AuthError } from "./errors";
import { requireOwner } from "./require-owner";
import { requireExtensionToken } from "./require-extension-token";

// PROJECT_SPEC.md §6.1 — "UI and extension poll GET /api/tasks/:id every
// 2s," so this one route accepts either a signed-in owner session or an
// extension bearer token. Session is tried first since that's the common
// case (site UI polling its own task).
export async function requireOwnerOrExtensionToken(request: Request): Promise<{ ownerId: string }> {
  try {
    const session = await requireOwner();
    return { ownerId: session.user.id };
  } catch (sessionError) {
    if (!(sessionError instanceof AuthError)) throw sessionError;
    const { ownerId } = await requireExtensionToken(request);
    return { ownerId };
  }
}
