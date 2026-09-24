import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { enqueueTask } from "@/lib/tasks/enqueue";
import { checkRateLimit } from "@/lib/security/rate-limit";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PDF_TYPE = "application/pdf";
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// PROJECT_SPEC.md §4.1 — extraction happens here (fast, synchronous); the
// slow AI parsing step runs as a "profile_import" task.
export async function POST(request: Request) {
  return withOwner(async (ownerId) => {
    const rateCheck = checkRateLimit(`ai_${ownerId}`, { maxRequests: 20, windowMs: 60000 });
    if (!rateCheck.success) {
      return jsonError("rate_limited", "AI import rate limit reached. Please wait a moment.", 429);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("invalid_input", "Missing file.", 400);
    }
    if (file.size > MAX_SIZE_BYTES) {
      return jsonError("invalid_input", "File too large (max 5MB).", 400);
    }

    const name = file.name.toLowerCase();
    const isPdf = file.type === PDF_TYPE || name.endsWith(".pdf");
    const isDocx = file.type === DOCX_TYPE || name.endsWith(".docx");
    if (!isPdf && !isDocx) {
      return jsonError("invalid_input", "Only PDF or DOCX files are supported.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText: string;
    try {
      if (isPdf) {
        const result = await extractText(new Uint8Array(buffer), { mergePages: true });
        extractedText = result.text;
      } else {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      }
    } catch {
      return jsonError("extraction_failed", "Could not read that file.", 422);
    }

    if (!extractedText.trim()) {
      return jsonError("extraction_failed", "No readable text was found in that file.", 422);
    }

    const { id } = await enqueueTask("profile_import", { extractedText });
    return NextResponse.json({ taskId: id }, { status: 202 });
  });
}
