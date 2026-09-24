# ApplyDesk

> Personal job application copilot — tailor ATS-safe resumes, generate grounded cover letters, sync PDFs to Google Drive, and autofill applications via Chrome extension without giving up control.

---

## 1. Principles & Design

- **I always click Submit.** The extension never submits forms or clicks Next/Continue. It only fills fields and attaches PDFs.
- **No hallucinated facts.** The AI rewrite engine is restricted strictly to verified facts from your Master Profile.
- **Deterministic fit scores.** Fit scores (0–100) are computed mathematically from extracted requirements and evidence, never invented by a model.
- **ATS-safe PDF generation.** Resumes and cover letters are rendered to clean, single-column PDFs using embedded fonts and standard headings.
- **Drive is the archive.** Approving an application locks the version, renders ATS PDFs, and syncs them to your personal Google Drive (`ApplyDesk/YYYY-MM Company — Title`).
- **Thin extension, smart site.** All AI, scoring, PDF rendering, and Drive integration live on the site. The extension only reads the page, fills inputs, and attaches files.

---

## 2. Architecture & Monorepo Structure

```
applydesk/
├── apps/
│   ├── web/               # Next.js 15 App Router, React 19, Tailwind v4, Drizzle ORM
│   └── extension/         # WXT Manifest V3, React 19, Tailwind v4, chrome.scripting
├── packages/
│   ├── shared/            # Zod schemas, deterministic scoring, typed API client
│   └── ui-preset/         # Shared design tokens (stone neutral, teal accent)
└── fixtures/              # Test fixtures for job postings and ATS forms
```

---

## 3. Prerequisites

- **Node.js**: v22+ (run `nvm use` to select from `.nvmrc`)
- **Package Manager**: `pnpm` (v9+)
- **Database**: [Neon](https://neon.tech) serverless PostgreSQL
- **AI Provider**: [Anthropic](https://console.anthropic.com) Claude API key
- **Storage & Sync**: [Google Cloud Console](https://console.cloud.google.com) OAuth Client with `drive.file` scope

---

## 4. Environment Variables

### `apps/web/.env`

| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | `postgres://user:pass@ep-...neon.tech/neondb?sslmode=require` |
| `BETTER_AUTH_SECRET` | 32-byte secret for session signing | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Base URL of the web app | `http://localhost:3000` |
| `OWNER_EMAIL` | Only this email address is allowed to sign in | `you@example.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | `GOCSPX-...` |
| `GOOGLE_DRIVE_REDIRECT_URI`| Authorized redirect URI | `http://localhost:3000/api/google/callback` |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM token encryption | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-api03-...` |
| `AI_MODEL_EXTRACT` | Model used for extraction and analysis | `claude-haiku-4-5-20251001` |
| `AI_MODEL_WRITE` | Model used for resume and cover letter writing | `claude-sonnet-4-5-20250929` |
| `EXTENSION_ID` | Chrome extension ID for CORS verification | `abcdefghijklmnopqrstuvwxyz123456` |

### `apps/extension/.env`

| Variable | Description | Default |
|---|---|---|
| `WXT_API_BASE_URL` | URL of the ApplyDesk web instance | `http://localhost:3000` |

---

## 5. Getting Started (Local Development)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment
```bash
cp apps/web/.env.example apps/web/.env
# Fill in your DATABASE_URL, OWNER_EMAIL, ANTHROPIC_API_KEY, ENCRYPTION_KEY, etc.
```

### 3. Apply database migrations
```bash
pnpm --filter web db:push
```

### 4. Run web development server
```bash
pnpm --filter web dev
```
Open `http://localhost:3000` in your browser and sign in with your `OWNER_EMAIL`.

### 5. Build and load the Chrome extension
```bash
# Build the extension
PATH="/Users/koushiksaha/.nvm/versions/node/v22.23.2/bin:$PATH" pnpm --filter extension build

# Or run extension dev mode with hot-reloading
pnpm --filter extension dev
```

**To load into Google Chrome**:
1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select `apps/extension/.output/chrome-mv3`.
4. Note your 32-character Extension ID and set `EXTENSION_ID=<id>` in `apps/web/.env`.

---

## 6. Daily Usage Workflow

1. **Connect the Extension**:
   - In ApplyDesk: go to **Settings → Extension tokens**.
   - Create a token (e.g. "MacBook Chrome"), copy the one-time `ad_...` token.
   - Click the extension icon in Chrome → click the **Settings gear** → paste the token and save. Click **Test connection** to verify green status.

2. **Save a Job**:
   - Browse to any job posting (LinkedIn, Greenhouse, Lever, Ashby, Indeed, Workday, or any web page).
   - Click the ApplyDesk extension icon. The job title, company, and description are automatically extracted.
   - Review or adjust the fields, then click **Send to ApplyDesk**.
   - Watch live analysis progress, then see the fit score (0–100) and match band.

3. **Review & Tailor Application**:
   - Open the job on ApplyDesk. Review required skills, evidence, and red flags.
   - Click **Generate application** to tailor your resume bullets and draft a voice-matched cover letter.
   - Edit bullets in the editor; the live humanizer checks for AI clichés, banned phrases, and ungrounded facts.

4. **Approve & Sync to Drive**:
   - Review the ATS-safe PDF preview.
   - Click **Approve & Save to Drive**.
   - ApplyDesk renders the PDFs and syncs them into your Google Drive folder: `ApplyDesk/YYYY-MM Company — Title/`.

5. **Apply on the ATS**:
   - Navigate to the job's application form page.
   - Open the ApplyDesk extension → switch to the **Apply** tab.
   - The extension auto-selects the approved job.
   - Click **Fill + attach**. Personal fields are filled and tailored resume/cover letter PDFs are attached via `DataTransfer`.
   - Complete any required essay fields listed under "Needs you", review the form, and click **Submit**.
   - Click **Mark as applied** in the extension popup to log the application timestamp in your pipeline.

---

## 7. Production Deployment (Vercel)

1. Push your repository to GitHub.
2. Import `apps/web` into [Vercel](https://vercel.com).
3. Set the Root Directory to `apps/web`.
4. Add all environment variables from `apps/web/.env` in Vercel Project Settings, with production values:
   - `BETTER_AUTH_URL` = your production URL (e.g. `https://your-domain.vercel.app`)
   - `GOOGLE_DRIVE_REDIRECT_URI` = `https://your-domain.vercel.app/api/google/callback`
   - `EXTENSION_ID` = the production extension's id (step 6 below) — CORS in `middleware.ts` rejects every `/api/ext/*` request until this matches
5. In Google Cloud Console:
   - Add your production URL to Authorized JavaScript Origins: `https://your-domain.vercel.app`
   - Add redirect URI: `https://your-domain.vercel.app/api/google/callback`
6. Load `apps/extension/.output/chrome-mv3` unpacked (or upload it) once to get its real extension id from `chrome://extensions`, or publish first as an unlisted Chrome Web Store item and use the id it's assigned — a locally-loaded unpacked extension's id changes if you re-load it from a different path, so for a stable production id, publish it (even unlisted) rather than loading it unpacked long-term.
7. Set `EXTENSION_ID` in Vercel to that id (step 4), then rebuild the extension pointed at production and (re)package it:
   ```bash
   WXT_API_BASE_URL="https://your-domain.vercel.app" pnpm --filter extension build
   pnpm --filter extension zip
   ```
8. Publish `apps/extension/.output/chrome-mv3.zip` as an unlisted extension on the Chrome Web Store (or keep loading it unpacked for personal use, accepting the id-stability caveat above).

---

## 8. Troubleshooting & FAQ

### Google Drive Token Expiration
- **Issue**: Google Drive disconnects after 7 days with error `invalid_grant`.
- **Fix**: In Google Cloud Console, ensure your OAuth consent screen Publishing Status is set to **"In production"**, not "Testing". Apps in "Testing" have refresh tokens that expire after 7 days. `drive.file` is a non-sensitive scope that does not require public verification for personal use.

### Extension CORS Forbidden (403)
- **Issue**: Extension requests fail with `403 CORS origin forbidden`.
- **Fix**: Verify `EXTENSION_ID` in `apps/web/.env` matches the ID shown in `chrome://extensions`. Restart the web dev server after updating `.env`.

### AI Outage or Rate Limit (429/529)
- **Issue**: Task displays `Anthropic AI service is temporarily overloaded or rate limited`.
- **Fix**: Wait a few moments and click **Retry** on the task progress bar. Model calls use exponential backoff and resume from the failed step.

---

## 9. Testing & Quality Checks

Run the automated test suites:
```bash
# Run logic unit tests (194 tests across web and shared)
pnpm test

# Run TypeScript validation across all workspaces
pnpm --filter @applydesk/shared typecheck
pnpm --filter web typecheck
pnpm --filter extension typecheck

# Run ESLint across all workspaces
pnpm lint
```
