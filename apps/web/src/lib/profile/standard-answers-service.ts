import { eq } from "drizzle-orm";
import { standardAnswersSchema, emptyStandardAnswers, type StandardAnswers } from "@applydesk/shared";
import { db } from "@/lib/db/client";
import { standardAnswers } from "@/lib/db/schema";

export async function getStandardAnswers(ownerId: string): Promise<StandardAnswers> {
  const [row] = await db
    .select({ data: standardAnswers.data })
    .from(standardAnswers)
    .where(eq(standardAnswers.ownerId, ownerId))
    .limit(1);

  return row ? standardAnswersSchema.parse(row.data) : emptyStandardAnswers();
}

export async function saveStandardAnswers(
  ownerId: string,
  data: StandardAnswers,
): Promise<StandardAnswers> {
  const validated = standardAnswersSchema.parse(data);

  await db
    .insert(standardAnswers)
    .values({ ownerId, data: validated })
    .onConflictDoUpdate({
      target: standardAnswers.ownerId,
      set: { data: validated },
    });

  return validated;
}
