import { z } from "zod";

export const voiceSampleInputSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
});

export type VoiceSampleInput = z.infer<typeof voiceSampleInputSchema>;
