import { describe, it, expect } from "vitest";
import { defaultSettings, settingsDataSchema } from "./settings";

describe("settings schema", () => {
  it("generates default settings with valid thresholds and models", () => {
    const defaults = defaultSettings();
    expect(defaults.scoreThresholds.strong).toBe(80);
    expect(defaults.scoreThresholds.good).toBe(65);
    expect(defaults.bannedPhrases.length).toBeGreaterThan(10);
    expect(defaults.models.extract).toBe("claude-haiku-4-5");
    expect(defaults.models.write).toBe("claude-sonnet-5");
  });

  it("parses custom overrides cleanly", () => {
    const custom = settingsDataSchema.parse({
      scoreThresholds: { strong: 85, good: 70 },
      bannedPhrases: ["custom-phrase"],
      models: { extract: "claude-haiku-custom", write: "claude-opus-custom" },
    });
    expect(custom.scoreThresholds.strong).toBe(85);
    expect(custom.bannedPhrases).toEqual(["custom-phrase"]);
    expect(custom.models.write).toBe("claude-opus-custom");
  });
});
