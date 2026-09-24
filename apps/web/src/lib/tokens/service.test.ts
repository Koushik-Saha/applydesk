import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, insertMock, updateMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  },
}));

const { listTokens, createToken, revokeToken } = await import("./service");

describe("tokens service", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
  });

  it("lists tokens for owner ordered by createdAt desc", async () => {
    const mockRows = [
      {
        id: "tok_1",
        name: "Laptop",
        prefix: "ad_12345678",
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date(),
      },
    ];

    selectMock.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(mockRows),
        }),
      }),
    });

    const tokens = await listTokens("owner_1");
    expect(tokens).toEqual(mockRows);
  });

  it("creates a token and returns the raw token starting with ad_", async () => {
    insertMock.mockReturnValue({
      values: (val: { name: string; prefix: string }) => ({
        returning: () =>
          Promise.resolve([
            {
              id: "tok_new",
              name: val.name,
              prefix: val.prefix,
              createdAt: new Date(),
            },
          ]),
      }),
    });

    const created = await createToken("owner_1", "Workstation");
    expect(created.id).toBe("tok_new");
    expect(created.name).toBe("Workstation");
    expect(created.token).toMatch(/^ad_[0-9a-f]{64}$/);
    expect(created.token.startsWith(created.prefix)).toBe(true);
  });

  it("throws error when creating a token without a name", async () => {
    await expect(createToken("owner_1", "   ")).rejects.toThrow("Token name is required");
  });

  it("revokes a token successfully", async () => {
    updateMock.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ id: "tok_1" }]),
        }),
      }),
    });

    const success = await revokeToken("owner_1", "tok_1");
    expect(success).toBe(true);
  });
});
