import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { user } from "../src/lib/db/schema";
import { getActiveProfile } from "../src/lib/profile/service";
import { getStandardAnswers } from "../src/lib/profile/standard-answers-service";
import { analyzeJobDescription } from "../src/lib/jobs/analyze";

const FIXTURES_DIR = join(__dirname, "..", "..", "..", "fixtures", "jobs");

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) throw new Error("OWNER_EMAIL is not set.");

  // matches lib/auth/allowlist.ts's case-insensitive comparison
  const [owner] = await db
    .select()
    .from(user)
    .where(sql`lower(${user.email}) = lower(${ownerEmail})`)
    .limit(1);
  if (!owner) throw new Error(`No user row for OWNER_EMAIL=${ownerEmail}. Sign in once first.`);

  const active = await getActiveProfile(owner.id);
  if (!active) throw new Error("No master profile saved yet — import or build one first.");
  const standardAnswers = await getStandardAnswers(owner.id);

  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) throw new Error(`No .txt fixtures found in ${FIXTURES_DIR}`);

  const rows: { file: string; score: number; band: string; flags: string }[] = [];

  for (const file of files) {
    const rawDescription = readFileSync(join(FIXTURES_DIR, file), "utf-8");
    const result = await analyzeJobDescription({ rawDescription, profile: active.profile, standardAnswers });

    const flagLabels = [
      result.flags.yearsGap && "years-gap",
      result.flags.clearance && "clearance",
      result.flags.sponsorship && "sponsorship",
      result.flags.locationMismatch && "location",
      ...result.flags.redFlags,
    ].filter((f): f is string => !!f);

    rows.push({ file, score: result.score, band: result.band, flags: flagLabels.join(", ") || "—" });
  }

  const fileWidth = Math.max(...rows.map((r) => r.file.length), "file".length);
  const header = `${"file".padEnd(fileWidth)}  score  band     flags`;
  console.log(header);
  console.log("-".repeat(header.length));
  for (const row of rows) {
    console.log(`${row.file.padEnd(fileWidth)}  ${String(row.score).padStart(5)}  ${row.band.padEnd(7)}  ${row.flags}`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
