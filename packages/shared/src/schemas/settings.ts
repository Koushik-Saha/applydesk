import { z } from "zod";

// PROJECT_SPEC.md §4.6 — starter list, editable later in Settings (§4.10,
// not yet built). Only the field the humanize lint needs today.
export const DEFAULT_BANNED_PHRASES = [
  "spearheaded",
  "leveraged",
  "utilized",
  "synergy",
  "passionate",
  "dynamic",
  "results-driven",
  "detail-oriented",
  "cutting-edge",
  "seamlessly",
  "seamless",
  "robust",
  "delve",
  "tapestry",
  "fast-paced environment",
  "proven track record",
  "hit the ground running",
  "i am writing to express my interest",
  "thrilled",
  "excited to apply",
];

export const settingsDataSchema = z.object({
  bannedPhrases: z.array(z.string()).default(DEFAULT_BANNED_PHRASES),
});

export type SettingsData = z.infer<typeof settingsDataSchema>;

export function defaultSettings(): SettingsData {
  return settingsDataSchema.parse({});
}
