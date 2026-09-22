import { and, desc, eq } from "drizzle-orm";
import type { VoiceSampleInput } from "@applydesk/shared";
import { db } from "@/lib/db/client";
import { voiceSamples } from "@/lib/db/schema";

export async function listVoiceSamples(ownerId: string) {
  return db
    .select()
    .from(voiceSamples)
    .where(eq(voiceSamples.ownerId, ownerId))
    .orderBy(desc(voiceSamples.createdAt));
}

export async function createVoiceSample(ownerId: string, input: VoiceSampleInput) {
  const [row] = await db
    .insert(voiceSamples)
    .values({ ownerId, ...input })
    .returning();
  return row;
}

export class VoiceSampleNotFoundError extends Error {}

export async function updateVoiceSample(ownerId: string, id: string, input: VoiceSampleInput) {
  const [row] = await db
    .update(voiceSamples)
    .set(input)
    .where(and(eq(voiceSamples.id, id), eq(voiceSamples.ownerId, ownerId)))
    .returning();

  if (!row) throw new VoiceSampleNotFoundError(`No such voice sample: ${id}`);
  return row;
}

export async function deleteVoiceSample(ownerId: string, id: string): Promise<void> {
  const [row] = await db
    .delete(voiceSamples)
    .where(and(eq(voiceSamples.id, id), eq(voiceSamples.ownerId, ownerId)))
    .returning({ id: voiceSamples.id });

  if (!row) throw new VoiceSampleNotFoundError(`No such voice sample: ${id}`);
}
