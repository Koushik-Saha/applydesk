import { NextResponse } from "next/server";
import { z } from "zod";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { DocumentNotFoundError, saveDocumentEdit } from "@/lib/documents/service";

const saveInputSchema = z.object({ content: z.unknown() });

// PROJECT_SPEC.md §9 — PUT /api/documents/:id "save edits (new version)."
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    const body = saveInputSchema.parse(await request.json());

    try {
      const document = await saveDocumentEdit(ownerId, id, body.content);
      return NextResponse.json({ document });
    } catch (error) {
      if (error instanceof DocumentNotFoundError) return jsonError("not_found", error.message, 404);
      throw error;
    }
  });
}
