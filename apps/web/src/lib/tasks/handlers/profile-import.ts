import { masterProfileSchema, type MasterProfile } from "@applydesk/shared";
import { generateStructured } from "@/lib/ai/client";
import {
  draftToMasterProfile,
  PROFILE_IMPORT_SYSTEM_PROMPT,
  PROMPT_VERSION,
  profileImportDraftSchema,
} from "@/lib/ai/prompts/profile-import";
import { registerTaskHandler } from "../registry";

export interface ProfileImportPayload {
  extractedText: string;
}

export interface ProfileImportResult {
  profile: MasterProfile;
  extractedText: string;
  promptVersion: string;
}

registerTaskHandler("profile_import", async (rawPayload, { setStep }): Promise<ProfileImportResult> => {
  const { extractedText } = rawPayload as ProfileImportPayload;

  await setStep("parsing");
  const { data: draft } = await generateStructured({
    step: "profile_import",
    // extraction, not writing -> the cheaper configured model
    model: process.env.AI_MODEL_EXTRACT || "claude-haiku-4-5-20251001",
    system: PROFILE_IMPORT_SYSTEM_PROMPT,
    input: extractedText,
    schema: profileImportDraftSchema,
  });

  await setStep("finalizing");
  // draftToMasterProfile() attaches ids/metrics in code; re-validate the
  // fully-assembled profile as defense-in-depth before handing it back.
  const profile = masterProfileSchema.parse(draftToMasterProfile(draft));

  return { profile, extractedText, promptVersion: PROMPT_VERSION };
});
