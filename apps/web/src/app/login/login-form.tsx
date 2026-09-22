"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const isRejected = searchParams.has("error");
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/login?error=not_owner",
    });
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
      <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-md bg-[var(--accent)] text-sm font-semibold text-white">
        A
      </div>
      <h1 className="text-lg font-semibold">ApplyDesk</h1>

      {isRejected ? (
        <>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-[var(--missing)]">
            <Lock className="size-4" aria-hidden="true" />
            This site is private.
          </p>
          <p className="mt-1 text-sm text-text-muted">Only one Google account can sign in here.</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-text-muted">Sign in to continue.</p>
      )}

      <Button className="mt-6 w-full" onClick={signIn} disabled={pending}>
        {pending ? "Redirecting…" : "Sign in with Google"}
      </Button>
    </div>
  );
}
