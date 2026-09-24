import { useState, useEffect } from "react";
import { createApplyDeskClient } from "@applydesk/shared";
import {
  CheckCircle2,
  XCircle,
  Key,
  Globe,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
  Activity,
  Loader2,
} from "lucide-react";
import { getExtensionConfig, saveExtensionConfig } from "../../lib/storage";

export default function OptionsApp() {
  const [token, setToken] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:3000");
  const [showToken, setShowToken] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    getExtensionConfig().then((config) => {
      setToken(config.token);
      if (config.apiBaseUrl) setApiBaseUrl(config.apiBaseUrl);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await saveExtensionConfig({ token, apiBaseUrl });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save options:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);

    try {
      // Automatically save first so test uses current values
      await saveExtensionConfig({ token, apiBaseUrl });

      const client = createApplyDeskClient({ baseUrl: apiBaseUrl, token });
      const result = await client.testConnection();

      if (result.ok) {
        setTestResult({
          ok: true,
          message: `Connected successfully! (Owner: ${result.ownerId ?? "verified"})`,
        });
      } else {
        setTestResult({
          ok: false,
          message: result.error || "Failed to authenticate token with ApplyDesk.",
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  function handleOpenSettings() {
    const targetUrl = `${apiBaseUrl.replace(/\/+$/, "")}/settings`;
    if (typeof browser !== "undefined" && browser.tabs) {
      browser.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, "_blank");
    }
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-border">
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-white font-bold text-lg">
          A
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text">ApplyDesk Extension Settings</h1>
          <p className="text-xs text-text-muted">
            Configure your bearer token and API endpoint to connect with your ApplyDesk workspace.
          </p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="mt-8 space-y-6">
        {/* Token field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="token" className="text-sm font-medium text-text flex items-center gap-1.5">
              <Key className="size-4 text-accent" />
              Extension Token
            </label>
            <button
              type="button"
              onClick={handleOpenSettings}
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              Get token in Settings <ExternalLink className="size-3" />
            </button>
          </div>

          <div className="relative">
            <input
              id="token"
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ad_..."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-mono text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent pr-10"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              title={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-xs text-text-muted">
            Format: starts with <code className="font-mono text-text">ad_</code> followed by 64 hex characters.
          </p>
        </div>

        {/* API Base URL field */}
        <div className="space-y-2">
          <label htmlFor="apiBaseUrl" className="text-sm font-medium text-text flex items-center gap-1.5">
            <Globe className="size-4 text-accent" />
            ApplyDesk API Base URL
          </label>
          <input
            id="apiBaseUrl"
            type="url"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <p className="text-xs text-text-muted">
            The URL of your deployed ApplyDesk app or local dev server.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Saving..." : "Save Settings"}
          </button>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !token.trim()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted disabled:opacity-50 transition-colors"
          >
            {testing ? <Loader2 className="size-4 animate-spin" /> : <Activity className="size-4" />}
            {testing ? "Testing..." : "Test Connection"}
          </button>

          {savedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> Saved
            </span>
          )}
        </div>
      </form>

      {/* Test Connection Results Card */}
      {testResult && (
        <div
          className={`mt-6 rounded-lg border p-4 text-sm flex items-start gap-3 ${
            testResult.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          }`}
        >
          {testResult.ok ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <XCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-semibold">
              {testResult.ok ? "Connection Successful" : "Connection Failed"}
            </p>
            <p className="text-xs opacity-90">{testResult.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
