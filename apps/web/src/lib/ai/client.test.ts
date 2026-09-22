import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { createMock, insertMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

vi.mock("@/lib/db/client", () => ({
  db: { insert: insertMock },
}));

function mockUsageLogging() {
  const values = vi.fn().mockResolvedValue(undefined);
  insertMock.mockReturnValue({ values });
  return { values };
}

function textMessage(text: string, usage = { input_tokens: 10, output_tokens: 5 }) {
  return { content: [{ type: "text", text }], usage };
}

const { generateStructured, GenerationValidationError } = await import("./client");

const schema = z.object({ answer: z.number() });
const baseParams = { step: "test_step", model: "claude-sonnet-5", system: "sys", input: "2+2?", schema };

describe("generateStructured", () => {
  beforeEach(() => {
    createMock.mockReset();
    insertMock.mockReset();
  });

  it("returns parsed data on a valid first response, with no retry", async () => {
    mockUsageLogging();
    createMock.mockResolvedValueOnce(textMessage(JSON.stringify({ answer: 4 })));

    const result = await generateStructured(baseParams);

    expect(result.data).toEqual({ answer: 4 });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("retries once after malformed JSON, then succeeds", async () => {
    mockUsageLogging();
    createMock
      .mockResolvedValueOnce(textMessage("not json"))
      .mockResolvedValueOnce(textMessage(JSON.stringify({ answer: 4 })));

    const result = await generateStructured(baseParams);

    expect(result.data).toEqual({ answer: 4 });
    expect(createMock).toHaveBeenCalledTimes(2);

    const secondCallMessages = createMock.mock.calls[1]?.[0].messages;
    expect(secondCallMessages.length).toBeGreaterThan(1);
    expect(secondCallMessages.at(-1).role).toBe("user");
  });

  it("retries once after a schema mismatch, then succeeds", async () => {
    mockUsageLogging();
    createMock
      .mockResolvedValueOnce(textMessage(JSON.stringify({ answer: "four" })))
      .mockResolvedValueOnce(textMessage(JSON.stringify({ answer: 4 })));

    const result = await generateStructured(baseParams);

    expect(result.data).toEqual({ answer: 4 });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("throws GenerationValidationError after exhausting the retry", async () => {
    mockUsageLogging();
    createMock.mockResolvedValue(textMessage("still not json"));

    await expect(generateStructured(baseParams)).rejects.toThrow(GenerationValidationError);
    expect(createMock).toHaveBeenCalledTimes(2); // 1 initial attempt + 1 retry
  });

  it("logs cumulative token usage to ai_usage even after final failure", async () => {
    const { values } = mockUsageLogging();
    createMock.mockResolvedValue(textMessage("still not json", { input_tokens: 10, output_tokens: 5 }));

    await generateStructured(baseParams).catch(() => {});

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ step: "test_step", model: "claude-sonnet-5", inputTokens: 20, outputTokens: 10 }),
    );
  });

  it("respects a custom maxRetries", async () => {
    mockUsageLogging();
    createMock.mockResolvedValue(textMessage("still not json"));

    await expect(generateStructured({ ...baseParams, maxRetries: 3 })).rejects.toThrow(
      GenerationValidationError,
    );
    expect(createMock).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });
});
