import { z } from "zod";

// PROJECT_SPEC.md §4.6, §4.10 — starter list, editable in Settings.
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

export const scoreThresholdsSchema = z.object({
  strong: z.number().int().min(0).max(100).default(80),
  good: z.number().int().min(0).max(100).default(65),
});

export const modelsSettingsSchema = z.object({
  extract: z.string().default("claude-haiku-4-5"),
  write: z.string().default("claude-sonnet-5"),
});

export const settingsDataSchema = z.object({
  scoreThresholds: scoreThresholdsSchema.default({ strong: 80, good: 65 }),
  bannedPhrases: z.array(z.string()).default(DEFAULT_BANNED_PHRASES),
  models: modelsSettingsSchema.default({ extract: "claude-haiku-4-5", write: "claude-sonnet-5" }),
});

export type ScoreThresholds = z.infer<typeof scoreThresholdsSchema>;
export type ModelsSettings = z.infer<typeof modelsSettingsSchema>;
export type SettingsData = z.infer<typeof settingsDataSchema>;

export function defaultSettings(): SettingsData {
  return settingsDataSchema.parse({});
}
