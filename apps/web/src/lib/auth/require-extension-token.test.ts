import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "./tokens";
import { AuthError } from "./errors";

const { selectMock, updateMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("../db/client", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

function mockSelectResult(rows: unknown[]) {
  selectMock.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  });
}

function mockUpdateResult() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  updateMock.mockReturnValue({ set });
  return { set, where };
}

const { requireExtensionToken } = await import("./require-extension-token");

function makeRequest(authorization?: string) {
  return new Request("http://localhost/api/ext/jobs", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("requireExtensionToken", () => {
  beforeEach(() => {
    selectMock.mockReset();
    updateMock.mockReset();
  });

  it("rejects a missing Authorization header", async () => {
    await expect(requireExtensionToken(makeRequest())).rejects.toThrow(AuthError);
  });

  it("rejects a non-Bearer scheme", async () => {
    await expect(requireExtensionToken(makeRequest("Basic abc123"))).rejects.toThrow(AuthError);
  });

  it("rejects a token with no matching row", async () => {
    mockSelectResult([]);
    await expect(requireExtensionToken(makeRequest("Bearer ad_unknown"))).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });
  });

  it("rejects a revoked token", async () => {
    mockSelectResult([
      { id: "tok_1", ownerId: "owner_1", tokenHash: hashToken("ad_valid"), revokedAt: new Date() },
    ]);
    await expect(requireExtensionToken(makeRequest("Bearer ad_valid"))).rejects.toThrow(AuthError);
  });

  it("accepts a valid, unrevoked token and updates lastUsedAt", async () => {
    mockSelectResult([
      { id: "tok_1", ownerId: "owner_1", tokenHash: hashToken("ad_valid"), revokedAt: null },
    ]);
    const { set, where } = mockUpdateResult();

    const result = await requireExtensionToken(makeRequest("Bearer ad_valid"));

    expect(result).toEqual({ ownerId: "owner_1", tokenId: "tok_1" });
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ lastUsedAt: expect.any(Date) }));
    expect(where).toHaveBeenCalledTimes(1);
  });
});
