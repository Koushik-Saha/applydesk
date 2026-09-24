import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/require-owner";
import { AuthError } from "@/lib/auth/errors";
import { getConnection } from "@/lib/google/service";
import { getSettings } from "@/lib/settings/service";
import { listTokens } from "@/lib/tokens/service";
import { GoogleDriveSettings } from "./google-drive-settings";
import { TokensSettings } from "./tokens-settings";
import { ScoringThresholdsSettings } from "./scoring-thresholds-settings";
import { BannedPhrasesSettings } from "./banned-phrases-settings";
import { ModelsSettingsComponent } from "./models-settings";
import { AiUsageSettings } from "./ai-usage-settings";
import { DataExportSettings } from "./data-export-settings";

export default async function SettingsPage() {
  let ownerId: string;
  try {
    const session = await requireOwner();
    ownerId = session.user.id;
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }

  const [connection, userSettings, tokenRows] = await Promise.all([
    getConnection(ownerId),
    getSettings(ownerId),
    listTokens(ownerId),
  ]);

  const serializedTokens = tokenRows.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    revokedAt: t.revokedAt?.toISOString() ?? null,
    createdAt: t.createdAt?.toISOString() ?? null,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold text-text">Settings</h1>
        <p className="text-sm text-text-muted">
          Manage integrations, score thresholds, AI models, and data exports.
        </p>
      </div>

      <Suspense fallback={<div className="h-48 rounded-xl border border-border bg-surface animate-pulse" />}>
        <GoogleDriveSettings
          initialConnected={!!connection}
          googleEmail={connection?.googleEmail ?? null}
          rootFolderId={connection?.rootFolderId ?? null}
          connectedAt={connection?.connectedAt?.toISOString() ?? null}
        />
      </Suspense>

      <TokensSettings initialTokens={serializedTokens} />

      <ScoringThresholdsSettings initialThresholds={userSettings.scoreThresholds} />

      <BannedPhrasesSettings initialPhrases={userSettings.bannedPhrases} />

      <ModelsSettingsComponent initialModels={userSettings.models} />

      <AiUsageSettings />

      <DataExportSettings />
    </div>
  );
}
