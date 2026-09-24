import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { google, type drive_v3 } from "googleapis";
import { db } from "@/lib/db/client";
import { googleConnections, jobFolders } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import { createOAuth2Client } from "./client";

export type GoogleDriveErrorCode = "disconnected" | "revoked" | "quota" | "unknown";

// PROJECT_SPEC.md M7 item 5 — "Handle Drive errors clearly (disconnected,
// quota, revoked) with a reconnect action." `code` lets callers (routes,
// the approve task) decide whether to show a reconnect action.
export class GoogleDriveError extends Error {
  code: GoogleDriveErrorCode;
  constructor(code: GoogleDriveErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function mapDriveError(error: unknown): GoogleDriveError {
  const err = error as { code?: number; response?: { data?: { error?: string } } };
  const reason = err.response?.data?.error;
  if (reason === "invalid_grant" || err.code === 401) {
    return new GoogleDriveError("revoked", "Google Drive access was revoked or expired. Reconnect to continue.");
  }
  if (err.code === 403 || err.code === 429) {
    return new GoogleDriveError("quota", "Google Drive quota or rate limit exceeded. Try again shortly.");
  }
  return new GoogleDriveError("unknown", error instanceof Error ? error.message : "Google Drive request failed.");
}

export async function saveConnection(ownerId: string, googleEmail: string, refreshToken: string): Promise<void> {
  const refreshTokenEnc = encrypt(refreshToken);
  await db
    .insert(googleConnections)
    .values({ ownerId, googleEmail, refreshTokenEnc })
    .onConflictDoUpdate({ target: googleConnections.ownerId, set: { googleEmail, refreshTokenEnc } });
}

export async function getConnection(ownerId: string) {
  const [row] = await db.select().from(googleConnections).where(eq(googleConnections.ownerId, ownerId)).limit(1);
  return row ?? null;
}

export async function disconnectGoogle(ownerId: string): Promise<void> {
  await db.delete(googleConnections).where(eq(googleConnections.ownerId, ownerId));
}

async function getDriveClient(ownerId: string): Promise<drive_v3.Drive> {
  const connection = await getConnection(ownerId);
  if (!connection) throw new GoogleDriveError("disconnected", "Google Drive is not connected.");

  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: decrypt(connection.refreshTokenEnc) });
  return google.drive({ version: "v3", auth: client });
}

const ROOT_FOLDER_NAME = "ApplyDesk";

export async function ensureRootFolder(ownerId: string): Promise<string> {
  const connection = await getConnection(ownerId);
  if (!connection) throw new GoogleDriveError("disconnected", "Google Drive is not connected.");
  if (connection.rootFolderId) return connection.rootFolderId;

  const drive = await getDriveClient(ownerId);
  try {
    const res = await drive.files.create({
      requestBody: { name: ROOT_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    const folderId = res.data.id!;
    await db.update(googleConnections).set({ rootFolderId: folderId }).where(eq(googleConnections.ownerId, ownerId));
    return folderId;
  } catch (error) {
    throw mapDriveError(error);
  }
}

// PROJECT_SPEC.md §4.8 — "ApplyDesk/<YYYY-MM> <Company> — <Job title>/"
export function jobFolderName(month: string, company: string, title: string): string {
  return `${month} ${company} — ${title}`;
}

export async function ensureJobFolder(
  ownerId: string,
  jobId: string,
  company: string,
  title: string,
): Promise<{ folderId: string; folderLink: string }> {
  const [existing] = await db.select().from(jobFolders).where(eq(jobFolders.jobId, jobId)).limit(1);
  if (existing) return { folderId: existing.driveFolderId, folderLink: existing.driveFolderLink };

  const rootFolderId = await ensureRootFolder(ownerId);
  const drive = await getDriveClient(ownerId);
  const month = new Date().toISOString().slice(0, 7);
  const name = jobFolderName(month, company, title);

  try {
    const res = await drive.files.create({
      requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [rootFolderId] },
      fields: "id, webViewLink",
    });
    const folderId = res.data.id!;
    const folderLink = res.data.webViewLink!;
    await db.insert(jobFolders).values({ jobId, driveFolderId: folderId, driveFolderLink: folderLink });
    return { folderId, folderLink };
  } catch (error) {
    throw mapDriveError(error);
  }
}

// Creates the file the first time; on every re-approve, replaces the same
// file's content in place (PROJECT_SPEC.md §4.7 "Drive files are replaced
// on re-approve") so the same fileId/webViewLink and name are kept.
export async function uploadOrReplaceFile(
  ownerId: string,
  folderId: string,
  fileName: string,
  content: Buffer,
  existingFileId?: string | null,
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = await getDriveClient(ownerId);
  const media = { mimeType: "application/pdf", body: Readable.from(content) };

  try {
    if (existingFileId) {
      const res = await drive.files.update({
        fileId: existingFileId,
        requestBody: { name: fileName },
        media,
        fields: "id, webViewLink",
      });
      return { fileId: res.data.id!, webViewLink: res.data.webViewLink! };
    }

    const res = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media,
      fields: "id, webViewLink",
    });
    return { fileId: res.data.id!, webViewLink: res.data.webViewLink! };
  } catch (error) {
    throw mapDriveError(error);
  }
}
