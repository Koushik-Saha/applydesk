import { Suspense } from "react";
import { LoginForm } from "./login-form";

// DESIGN.md — calm, minimal, one accent color. This is the only page a
// non-owner Google account can ever reach.
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
