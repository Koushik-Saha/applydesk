import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn() }));

vi.mock("@/lib/db/client", () => ({
  db: { update: updateMock },
}));

function mockUpdateSequence(...results: unknown[][]) {
  let call = 0;
  const set = vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve(results[call++] ?? [])),
    })),
  }));
  updateMock.mockImplementation(() => ({ set }));
  return { set };
}

const { registerTaskHandler } = await import("./registry");
const { runTask } = await import("./run-task");

describe("runTask locking", () => {
  beforeEach(() => {
    updateMock.mockReset();
  });

  it("does nothing if the task is not (or no longer) queued", async () => {
    mockUpdateSequence([]); // claim UPDATE matches 0 rows

    const handler = vi.fn();
    registerTaskHandler("locking_test_a", handler);

    await runTask("task-1");

    expect(handler).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledTimes(1); // only the claim attempt
  });

  it("runs the handler once claimed, then marks the task done", async () => {
    mockUpdateSequence(
      [{ id: "task-2", type: "locking_test_b", payload: { foo: "bar" }, attempts: 1 }], // claim succeeds
      [{ id: "task-2" }], // final "done" update
    );

    const handler = vi.fn().mockResolvedValue(undefined);
    registerTaskHandler("locking_test_b", handler);

    await runTask("task-2");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ foo: "bar" }, expect.objectContaining({ taskId: "task-2" }));
    expect(updateMock).toHaveBeenCalledTimes(2); // claim + done
  });

  it("marks the task failed with the error message when the handler throws", async () => {
    mockUpdateSequence(
      [{ id: "task-3", type: "locking_test_c", payload: {}, attempts: 1 }], // claim succeeds
      [{ id: "task-3" }], // failed update
    );

    const handler = vi.fn().mockRejectedValue(new Error("boom"));
    registerTaskHandler("locking_test_c", handler);

    await runTask("task-3");

    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it("fails immediately with no handler call when no handler is registered for the type", async () => {
    mockUpdateSequence(
      [{ id: "task-4", type: "locking_test_unregistered", payload: {}, attempts: 1 }],
      [{ id: "task-4" }],
    );

    await runTask("task-4");

    expect(updateMock).toHaveBeenCalledTimes(2); // claim + failed (no handler)
  });
});
