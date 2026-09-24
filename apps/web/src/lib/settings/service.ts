import { eq } from "drizzle-orm";
import { defaultSettings, settingsDataSchema, type SettingsData } from "@applydesk/shared";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

export async function getSettings(ownerId: string): Promise<SettingsData> {
  const [row] = await db
    .select({ data: settings.data })
    .from(settings)
    .where(eq(settings.ownerId, ownerId))
    .limit(1);

  if (!row) return defaultSettings();
  return settingsDataSchema.parse(row.data);
}

export async function saveSettings(
  ownerId: string,
  newData: Partial<SettingsData>,
): Promise<SettingsData> {
  const current = await getSettings(ownerId);
  const merged = settingsDataSchema.parse({
    ...current,
    ...newData,
  });

  await db
    .insert(settings)
    .values({ ownerId, data: merged })
    .onConflictDoUpdate({
      target: settings.ownerId,
      set: { data: merged, updatedAt: new Date() },
    });

  return merged;
}
