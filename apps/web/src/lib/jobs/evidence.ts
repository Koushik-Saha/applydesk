import type { EvidenceItem } from "@/lib/ai/prompts/job-analyze";

// PROJECT_SPEC.md §4.3 step 2 — "Code verifies every returned ID exists;
// unknown IDs are dropped and the item downgraded." A dropped id means the
// model referenced evidence that doesn't exist, so the item's status is
// downgraded one tier (met -> partial -> missing) as a hallucination
// penalty; separately, a status can never survive with zero real evidence
// behind it.
function downgrade(status: EvidenceItem["status"]): EvidenceItem["status"] {
  if (status === "met") return "partial";
  if (status === "partial") return "missing";
  return "missing";
}

export function verifyEvidence(items: EvidenceItem[], validBulletIds: ReadonlySet<string>): EvidenceItem[] {
  return items.map((item) => {
    const evidenceBulletIds = item.evidenceBulletIds.filter((id) => validBulletIds.has(id));
    const hadInvalidIds = evidenceBulletIds.length < item.evidenceBulletIds.length;

    let status = hadInvalidIds ? downgrade(item.status) : item.status;
    if (evidenceBulletIds.length === 0 && status !== "missing") status = "missing";

    return { ...item, evidenceBulletIds, status };
  });
}
