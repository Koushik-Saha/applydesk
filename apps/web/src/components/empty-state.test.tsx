import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Briefcase } from "lucide-react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the message and action", () => {
    render(
      <EmptyState
        icon={Briefcase}
        message="No jobs yet."
        action={<button>Add job</button>}
      />,
    );

    expect(screen.getByText("No jobs yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add job" })).toBeInTheDocument();
  });
});
