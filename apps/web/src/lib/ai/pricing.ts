// PROJECT_SPEC.md §6.2 — "price table in config," used to log an estimated
// cost per generateStructured() call to ai_usage.
//
// These are Anthropic's per-tier rates (USD per 1M tokens) as of this
// writing — verify against https://www.anthropic.com/pricing before
// trusting the numbers in Settings -> Usage; they're an estimate, not
// billing data.
interface ModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
}

const TIER_PRICING: Record<string, ModelPricing> = {
  opus: { inputPerMillionTokens: 15, outputPerMillionTokens: 75 },
  sonnet: { inputPerMillionTokens: 3, outputPerMillionTokens: 15 },
  haiku: { inputPerMillionTokens: 0.8, outputPerMillionTokens: 4 },
};

function findPricing(model: string): ModelPricing | undefined {
  const lower = model.toLowerCase();
  const tier = Object.keys(TIER_PRICING).find((t) => lower.includes(t));
  return tier ? TIER_PRICING[tier] : undefined;
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = findPricing(model);
  if (!pricing) {
    console.warn(`[ai] no pricing tier matched for model "${model}"; logging cost as 0`);
    return 0;
  }
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMillionTokens +
    (outputTokens / 1_000_000) * pricing.outputPerMillionTokens
  );
}
