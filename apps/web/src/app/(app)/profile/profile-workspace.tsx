"use client";

import { useQuery } from "@tanstack/react-query";
import type { MasterProfile, StandardAnswers } from "@applydesk/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileEditor } from "./profile-editor";
import { StandardAnswersTab } from "./standard-answers-tab";
import { VoiceSamplesTab } from "./voice-samples-tab";
import { VersionsTab } from "./versions-tab";
import type { ProfileVersionSummary } from "@/lib/profile/service";

interface VoiceSample {
  id: string;
  title: string;
  text: string;
}

interface ProfileWorkspaceProps {
  initialProfile: MasterProfile;
  initialVersion: number | null;
  initialAnswers: StandardAnswers;
  initialVoiceSamples: VoiceSample[];
  initialVersions: ProfileVersionSummary[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load profile.");
  return res.json();
}

// DESIGN.md "Profile" — the collapsible-section editor plus three tabs:
// Standard answers, Voice samples, Versions.
export function ProfileWorkspace({
  initialProfile,
  initialVersion,
  initialAnswers,
  initialVoiceSamples,
  initialVersions,
}: ProfileWorkspaceProps) {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchJson<{ profile: MasterProfile; version: number | null }>("/api/profile"),
    initialData: { profile: initialProfile, version: initialVersion },
  });

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="standard-answers">Standard answers</TabsTrigger>
        <TabsTrigger value="voice-samples">Voice samples</TabsTrigger>
        <TabsTrigger value="versions">Versions</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        {profileQuery.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : profileQuery.isError ? (
          <ErrorState message="Failed to load your profile." onRetry={() => profileQuery.refetch()} />
        ) : (
          // Keyed by version: after a save or restore the version changes,
          // remounting the editor with fresh initial state (and clearing
          // "unsaved changes") instead of fighting prop/state sync.
          <ProfileEditor
            key={profileQuery.data.version ?? "unsaved"}
            initialProfile={profileQuery.data.profile}
            version={profileQuery.data.version}
          />
        )}
      </TabsContent>

      <TabsContent value="standard-answers" className="mt-4">
        <StandardAnswersTab initialAnswers={initialAnswers} />
      </TabsContent>

      <TabsContent value="voice-samples" className="mt-4">
        <VoiceSamplesTab initialSamples={initialVoiceSamples} />
      </TabsContent>

      <TabsContent value="versions" className="mt-4">
        <VersionsTab initialVersions={initialVersions} activeVersion={profileQuery.data.version} />
      </TabsContent>
    </Tabs>
  );
}
