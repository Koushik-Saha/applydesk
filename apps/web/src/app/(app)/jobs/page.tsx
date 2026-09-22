import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/require-owner";
import { AuthError } from "@/lib/auth/errors";
import { listJobs } from "@/lib/jobs/service";
import { JobsTable } from "./jobs-table";

export default async function JobsPage() {
  let ownerId: string;
  try {
    const session = await requireOwner();
    ownerId = session.user.id;
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }

  const jobs = await listJobs(ownerId, {});

  return (
    <JobsTable
      initialJobs={jobs.map((j) => ({
        id: j.id,
        company: j.company,
        title: j.title,
        score: j.score,
        band: j.band,
        status: j.status,
        createdAt: j.createdAt.toISOString(),
        appliedAt: j.appliedAt ? j.appliedAt.toISOString() : null,
      }))}
    />
  );
}
