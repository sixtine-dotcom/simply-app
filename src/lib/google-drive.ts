import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/calendar-sync";
import { getRecordingAccessLink } from "@/lib/daily";

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3";
const RECORDINGS_FOLDER_NAME = "Simply Coaching Recordings";

function sanitizeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findDriveFolder(accessToken: string, name: string, parentId?: string | null) {
  const query = [
    `name = '${escapeDriveQueryValue(name)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    parentId ? `'${escapeDriveQueryValue(parentId)}' in parents` : null,
  ]
    .filter(Boolean)
    .join(" and ");
  const url = new URL(`${DRIVE_API_URL}/files`);
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name)");
  url.searchParams.set("pageSize", "1");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google Drive folder lookup failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.files?.[0]?.id as string | undefined;
}

async function createDriveFolder(accessToken: string, name: string, parentId?: string | null) {
  const response = await fetch(`${DRIVE_API_URL}/files?fields=id,name`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google Drive folder create failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.id as string;
}

async function ensureDriveFolder(accessToken: string, name: string, parentId?: string | null) {
  return (
    (await findDriveFolder(accessToken, name, parentId)) ||
    (await createDriveFolder(accessToken, name, parentId))
  );
}

async function uploadBufferToDrive(input: {
  accessToken: string;
  fileName: string;
  mimeType: string;
  parentId: string;
  body: ArrayBuffer;
}) {
  const metadata = {
    name: input.fileName,
    mimeType: input.mimeType,
    parents: [input.parentId],
  };
  const boundary = `simply-${crypto.randomUUID()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const encoder = new TextEncoder();
  const metadataPart = encoder.encode(
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: ${input.mimeType}\r\n\r\n`
  );
  const mediaPart = new Uint8Array(input.body);
  const closingPart = encoder.encode(closeDelimiter);
  const multipartBody = new Uint8Array(
    metadataPart.length + mediaPart.length + closingPart.length
  );
  multipartBody.set(metadataPart, 0);
  multipartBody.set(mediaPart, metadataPart.length);
  multipartBody.set(closingPart, metadataPart.length + mediaPart.length);

  const response = await fetch(
    `${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,webViewLink,webContentLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );
  if (!response.ok) {
    throw new Error(`Google Drive upload failed: ${await response.text()}`);
  }

  return response.json() as Promise<{
    id: string;
    webViewLink?: string;
    webContentLink?: string;
  }>;
}

export async function uploadCoachingRecordingToGoogleDrive(recordingId: string) {
  const recording = await db.coachingRecording.findUnique({
    where: { id: recordingId },
    include: {
      course: { select: { title: true, coachId: true } },
      session: {
        select: {
          title: true,
          coachId: true,
          scheduledAt: true,
          client: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!recording || recording.googleDriveFileId) {
    return { uploaded: false, reason: "missing-or-already-uploaded" };
  }

  const coachId = recording.coachId || recording.session?.coachId || recording.course?.coachId;
  if (!coachId) {
    return { uploaded: false, reason: "coach-not-found" };
  }

  const connection = await db.calendarConnection.findFirst({
    where: { userId: coachId, provider: "google", syncEnabled: true },
  });
  if (!connection) {
    return { uploaded: false, reason: "google-not-connected" };
  }

  const accessToken = await getValidAccessToken(connection);
  const rootFolderId = await ensureDriveFolder(accessToken, RECORDINGS_FOLDER_NAME);
  const contextFolderName =
    recording.course?.title ||
    (recording.session?.client
      ? `${recording.session.client.firstName} ${recording.session.client.lastName}`.trim()
      : "Losse vergaderingen");
  const contextFolderId = await ensureDriveFolder(
    accessToken,
    sanitizeFileName(contextFolderName || "Losse vergaderingen"),
    rootFolderId
  );

  const accessLink = await getRecordingAccessLink(recording.dailyRecordingId, 3600);
  const recordingResponse = await fetch(accessLink.download_link);
  if (!recordingResponse.ok) {
    throw new Error(`Daily recording download failed: ${await recordingResponse.text()}`);
  }

  const mimeType = recordingResponse.headers.get("content-type") || "video/mp4";
  const extension = mimeType.includes("mp4") ? "mp4" : "webm";
  const scheduledAt = recording.scheduledAt || recording.session?.scheduledAt || recording.createdAt;
  const datePrefix = scheduledAt.toISOString().slice(0, 10);
  const fileName = `${datePrefix} - ${sanitizeFileName(
    recording.title || recording.session?.title || recording.course?.title || "Coaching sessie"
  )}.${extension}`;

  const uploaded = await uploadBufferToDrive({
    accessToken,
    fileName,
    mimeType,
    parentId: contextFolderId,
    body: await recordingResponse.arrayBuffer(),
  });

  await db.coachingRecording.update({
    where: { id: recording.id },
    data: {
      googleDriveFileId: uploaded.id,
      googleDriveWebViewLink: uploaded.webViewLink ?? uploaded.webContentLink ?? null,
      googleDriveFolderId: contextFolderId,
      googleDriveUploadedAt: new Date(),
    },
  });

  return { uploaded: true, fileId: uploaded.id };
}
