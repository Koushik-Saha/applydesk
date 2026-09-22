import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/require-owner";
import { AuthError } from "@/lib/auth/errors";
import { getActiveProfile } from "@/lib/profile/service";
import { getStandardAnswers } from "@/lib/profile/standard-answers-service";
import { listVoiceSamples } from "@/lib/profile/voice-samples-service";
import { listProfileVersions } from "@/lib/profile/service";
import { emptyMasterProfile } from "@applydesk/shared";
import { ProfileWorkspace } from "./profile-workspace";

export default async function ProfilePage() {
  let ownerId: string;
  try {
    const session = await requireOwner();
    ownerId = session.user.id;
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }

  const [active, answers, voiceSamples, versions] = await Promise.all([
    getActiveProfile(ownerId),
    getStandardAnswers(ownerId),
    listVoiceSamples(ownerId),
    listProfileVersions(ownerId),
  ]);

  return (
    <ProfileWorkspace
      initialProfile={active?.profile ?? emptyMasterProfile()}
      initialVersion={active?.version ?? null}
      initialAnswers={answers}
      initialVoiceSamples={voiceSamples}
      initialVersions={versions}
    />
  );
}
