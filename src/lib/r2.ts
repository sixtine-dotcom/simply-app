import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type UploadToR2Input = {
  key: string;
  body: Buffer;
  contentType: string;
};

const r2Config = {
  endpoint: process.env.R2_ENDPOINT?.trim() ?? "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "",
  bucket: process.env.R2_BUCKET?.trim() ?? "",
  publicUrl: process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "") ?? "",
};

export function isR2Configured() {
  return Boolean(
    r2Config.endpoint &&
      r2Config.accessKeyId &&
      r2Config.secretAccessKey &&
      r2Config.bucket &&
      r2Config.publicUrl
  );
}

let client: S3Client | null = null;

function getR2Client() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  return client;
}

export async function uploadToR2({ key, body, contentType }: UploadToR2Input) {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured");
  }

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: `${r2Config.publicUrl}/${key}`,
  };
}

// Lets a trusted client (the local video pipeline) upload large files straight to R2.
export async function createR2UploadUrl({
  key,
  contentType,
  expiresInSeconds = 3600,
}: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured");
  }

  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({ Bucket: r2Config.bucket, Key: key, ContentType: contentType }),
    { expiresIn: expiresInSeconds }
  );

  return { key, uploadUrl, url: `${r2Config.publicUrl}/${key}` };
}

// Multipart upload in ~5 MB parts, so a flaky connection only has to retry one part.
export async function createR2MultipartUpload({
  key,
  contentType,
  partCount,
}: {
  key: string;
  contentType: string;
  partCount: number;
}) {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured");
  }
  const client = getR2Client();
  const created = await client.send(
    new CreateMultipartUploadCommand({ Bucket: r2Config.bucket, Key: key, ContentType: contentType })
  );
  const uploadId = created.UploadId!;
  const partUrls = await Promise.all(
    Array.from({ length: partCount }, (_, i) =>
      getSignedUrl(
        client,
        new UploadPartCommand({ Bucket: r2Config.bucket, Key: key, UploadId: uploadId, PartNumber: i + 1 }),
        { expiresIn: 3 * 3600 }
      )
    )
  );
  return { key, uploadId, partUrls, url: `${r2Config.publicUrl}/${key}` };
}

export async function completeR2MultipartUpload({
  key,
  uploadId,
  parts,
}: {
  key: string;
  uploadId: string;
  parts: Array<{ PartNumber: number; ETag: string }>;
}) {
  await getR2Client().send(
    new CompleteMultipartUploadCommand({
      Bucket: r2Config.bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    })
  );
  return { key, url: `${r2Config.publicUrl}/${key}` };
}
