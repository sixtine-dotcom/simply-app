import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
