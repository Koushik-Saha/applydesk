import { eq } from "drizzle-orm";
import { defaultSettings, settingsDataSchema, type SettingsData } from "@applydesk/shared";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

// PROJECT_SPEC.md §4.10 — settings aren't editable in the UI yet (that's a
// later milestone), so this just returns the saved row merged over
// defaults, falling back to pure defaults when nothing's been saved.
export async function getSettings(ownerId: string): Promise<SettingsData> {
  const [row] = await db.select({ data: settings.data }).from(settings).where(eq(settings.ownerId, ownerId)).limit(1);
  if (!row) return defaultSettings();
  return settingsDataSchema.parse(row.data);
}
