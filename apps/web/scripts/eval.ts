import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { user } from "../src/lib/db/schema";
import { getActiveProfile } from "../src/lib/profile/service";
import { getStandardAnswers } from "../src/lib/profile/standard-answers-service";
import { listVoiceSamples } from "../src/lib/profile/voice-samples-service";
import { getSettings } from "../src/lib/settings/service";
import { analyzeJobDescription } from "../src/lib/jobs/analyze";
import { generateJobDocuments } from "../src/lib/generation/generate";

const WRITE_MODEL = process.env.AI_MODEL_WRITE || "claude-sonnet-5";

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
  const [voiceSamples, settingsData] = await Promise.all([listVoiceSamples(owner.id), getSettings(owner.id)]);

  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) throw new Error(`No .txt fixtures found in ${FIXTURES_DIR}`);

  const rows: {
    file: string;
    score: number;
    band: string;
    flags: string;
    violations: number;
    lintWarnings: number;
    postScore: number;
  }[] = [];

  for (const file of files) {
    const rawDescription = readFileSync(join(FIXTURES_DIR, file), "utf-8");
    const analysis = await analyzeJobDescription({ rawDescription, profile: active.profile, standardAnswers });

    const flagLabels = [
      analysis.flags.yearsGap && "years-gap",
      analysis.flags.clearance && "clearance",
      analysis.flags.sponsorship && "sponsorship",
      analysis.flags.locationMismatch && "location",
      ...analysis.flags.redFlags,
    ].filter((f): f is string => !!f);

    // Resume only: fixtures are bare job-description text with no company
    // name, so a cover letter (addressed "to the company") isn't
    // meaningful here — that path has its own unit tests instead.
    const generated = await generateJobDocuments({
      profile: active.profile,
      requirements: analysis.requirements,
      evidence: analysis.evidence,
      keywordsFoundBefore: analysis.keywordsFound.length,
      voiceSamples: voiceSamples.map((v) => v.text),
      bannedPhrases: settingsData.bannedPhrases,
      kinds: ["resume"],
      writeModel: WRITE_MODEL,
    });

    rows.push({
      file,
      score: analysis.score,
      band: analysis.band,
      flags: flagLabels.join(", ") || "—",
      violations: generated.resume?.validation.violations.length ?? 0,
      lintWarnings:
        (generated.resume?.lint.warnings.length ?? 0) +
        (generated.resume?.content.experiences.flatMap((e) => e.bullets).flatMap((b) => b.lintWarnings).length ?? 0),
      postScore: generated.resume?.content.keywordCoverage.after ?? 0,
    });
  }

  const fileWidth = Math.max(...rows.map((r) => r.file.length), "file".length);
  const header = `${"file".padEnd(fileWidth)}  score  band     flags                     violations  lint  post-score`;
  console.log(header);
  console.log("-".repeat(header.length));
  for (const row of rows) {
    console.log(
      `${row.file.padEnd(fileWidth)}  ${String(row.score).padStart(5)}  ${row.band.padEnd(7)}  ${row.flags.padEnd(24)}  ${String(row.violations).padStart(10)}  ${String(row.lintWarnings).padStart(4)}  ${String(row.postScore).padStart(10)}`,
    );
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
