import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { db } from "@/lib/db/client";
import { aiUsage } from "@/lib/db/schema";
import { estimateCostUsd } from "./pricing";

// Lazy: constructing eagerly at module load means simply *importing* this
// file (e.g. transitively, via lib/tasks/handlers) constructs a real
// Anthropic client — which throws under Vitest's jsdom environment
// ("browser-like environment") even when generateStructured() is never
// called.
let anthropicClient: Anthropic | undefined;
function getClient(): Anthropic {
  anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

export interface GenerateStructuredParams<T> {
  /** Pipeline step name, logged to ai_usage (e.g. "extract_requirements"). */
  step: string;
  model: string;
  system: string;
  input: string;
  schema: z.ZodType<T>;
  jobId?: string;
  maxRetries?: number;
  timeoutMs?: number;
  maxTokens?: number;
}

export interface GenerateStructuredResult<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}

export class GenerationValidationError extends Error {}
export class AiServiceError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "AiServiceError";
  }
}

export async function generateStructured<T>({
  step,
  model,
  system,
  input,
  schema,
  jobId,
  maxRetries = 1,
  timeoutMs = 60_000,
  maxTokens = 4096,
}: GenerateStructuredParams<T>): Promise<GenerateStructuredResult<T>> {
  const format = zodOutputFormat(schema);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: input }];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let lastError: Error = new GenerationValidationError("generateStructured: no attempts made");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let message: Anthropic.Message;
    try {
      message = await getClient().messages.create(
        { model, system, max_tokens: maxTokens, messages, output_config: { format } },
        { timeout: timeoutMs },
      );
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      const status = errorObj.status;
      if (status === 429) {
        throw new AiServiceError("Anthropic AI rate limit reached. Please retry in a few moments.", 429);
      }
      if (status === 529 || status === 500 || status === 503) {
        throw new AiServiceError(
          "Anthropic AI service is temporarily overloaded or unavailable. Please retry shortly.",
          status,
        );
      }
      if (status === 401) {
        throw new AiServiceError("Anthropic API key is invalid or unauthorized. Please check ANTHROPIC_API_KEY.", 401);
      }
      throw err;
    }

    totalInputTokens += message.usage.input_tokens;
    totalOutputTokens += message.usage.output_tokens;

    const textBlock = message.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    const rawText = textBlock?.text ?? "";

    try {
      const data = format.parse(rawText) as T;
      await logUsage({ jobId, step, model, inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
      return {
        data,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          costUsd: estimateCostUsd(model, totalInputTokens, totalOutputTokens),
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        messages.push({ role: "assistant", content: rawText });
        messages.push({
          role: "user",
          content: `Your previous response was invalid: ${lastError.message}\n\nCorrect it and respond again with valid JSON matching the schema.`,
        });
      }
    }
  }

  await logUsage({ jobId, step, model, inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
  throw new GenerationValidationError(
    `generateStructured("${step}") failed after ${maxRetries + 1} attempt(s): ${lastError.message}`,
  );
}

async function logUsage(params: {
  jobId?: string;
  step: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const costUsd = estimateCostUsd(params.model, params.inputTokens, params.outputTokens);
  await db.insert(aiUsage).values({
    jobId: params.jobId,
    step: params.step,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    costUsd: costUsd.toFixed(6),
  });
}
