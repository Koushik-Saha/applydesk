"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Key, Copy, Check, Plus, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export interface SerializedTokenSummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
}

interface TokensSettingsProps {
  initialTokens: SerializedTokenSummary[];
}

export function TokensSettings({ initialTokens }: TokensSettingsProps) {
  const [tokens, setTokens] = useState<SerializedTokenSummary[]>(initialTokens);
  const [newTokenName, setNewTokenName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // One-time token reveal state
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTokenName.trim()) {
      toast.error("Please enter a token name.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message ?? "Failed to create token.");
      }

      const data = await res.json();
      setRevealedToken(data.token);
      setCopied(false);
      setNewTokenName("");

      // Add to list
      const serializedNewToken: SerializedTokenSummary = {
        id: data.id,
        name: data.name,
        prefix: data.prefix,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: data.createdAt ?? new Date().toISOString(),
      };
      setTokens((prev) => [serializedNewToken, ...prev]);

      toast.success("Extension token created! Copy it now.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create token.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Are you sure you want to revoke this token? Any extension using it will be disconnected.")) {
      return;
    }

    setRevokingId(id);
    try {
      const res = await fetch(`/api/tokens/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to revoke token.");
      }

      setTokens((prev) =>
        prev.map((t) => (t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t)),
      );
      toast.success("Token revoked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke token.");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleCopyToken() {
    if (!revealedToken) return;
    try {
      await navigator.clipboard.writeText(revealedToken);
      setCopied(true);
      toast.success("Token copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "Never";
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(date);
    } catch {
      return iso;
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
          <Key className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-medium text-text">Extension Tokens</h2>
          <p className="text-xs text-text-muted">
            Generate and manage bearer tokens for the ApplyDesk Chrome extension.
          </p>
        </div>
      </div>

      {/* One-time reveal modal / alert */}
      {revealedToken && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3">
          <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Copy your new extension token</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Make sure to copy this token now. It will <strong>never</strong> be shown again.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-900 rounded-md text-stone-900 dark:text-stone-100 select-all overflow-x-auto">
              {revealedToken}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyToken}
              className="gap-1.5 shrink-0"
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRevealedToken(null)}
              className="shrink-0 text-xs"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Create token form */}
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full space-y-1.5">
          <Label htmlFor="token-name" className="text-xs text-text-muted">
            Token Name
          </Label>
          <Input
            id="token-name"
            placeholder="e.g. MacBook Chrome"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            disabled={creating}
            className="h-9 text-sm"
          />
        </div>
        <Button
          type="submit"
          disabled={creating || !newTokenName.trim()}
          className="h-9 gap-1.5 shrink-0"
        >
          {creating ? <Spinner /> : <Plus className="size-4" />}
          {creating ? "Generating..." : "Generate Token"}
        </Button>
      </form>

      {/* Tokens List */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Active & Revoked Tokens
        </h3>

        {tokens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
            No extension tokens created yet. Generate one above to connect the Chrome extension.
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {tokens.map((tok) => {
              const isRevoked = Boolean(tok.revokedAt);
              return (
                <div
                  key={tok.id}
                  className="flex items-center justify-between p-4 bg-surface hover:bg-surface-muted/50 transition-colors"
                >
                  <div className="space-y-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text">{tok.name}</span>
                      <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-surface-muted text-text-muted border border-border">
                        {tok.prefix}…
                      </code>
                      {isRevoked ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                          Revoked
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted flex items-center gap-3">
                      <span>Created: {formatDate(tok.createdAt)}</span>
                      <span>•</span>
                      <span>Last used: {formatDate(tok.lastUsedAt)}</span>
                    </div>
                  </div>

                  {!isRevoked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(tok.id)}
                      disabled={revokingId === tok.id}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 text-xs shrink-0"
                    >
                      {revokingId === tok.id ? <Spinner className="size-3.5" /> : <Trash2 className="size-3.5" />}
                      {revokingId === tok.id ? "Revoking..." : "Revoke"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
