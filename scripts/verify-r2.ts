import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(join(process.cwd(), ".env"));
loadEnvFile(join(process.cwd(), ".env.local"));

const required = [
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error("Ontbrekende R2 variabelen in .env / .env.local:");
  for (const key of missing) {
    console.error(`  - ${key}`);
  }
  console.error("\nZie SETUP.md → Cloudflare R2 Storage voor instructies.");
  process.exit(1);
}

const endpoint = process.env.R2_ENDPOINT!.trim();
const bucket = process.env.R2_BUCKET!.trim();
const publicUrl = process.env.R2_PUBLIC_URL!.trim().replace(/\/$/, "");

const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
  },
  forcePathStyle: true,
});

const testKey = `uploads/r2-verify-${Date.now()}.txt`;
const testBody = "Simply R2 connectivity check";

async function main() {
  console.log("R2 configuratie gevonden.");
  console.log(`  Endpoint: ${endpoint}`);
  console.log(`  Bucket:   ${bucket}`);
  console.log(`  Public:   ${publicUrl}`);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testBody,
      ContentType: "text/plain",
    })
  );

  await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: testKey,
    })
  );

  const objectUrl = `${publicUrl}/${testKey}`;
  console.log("\nUpload + metadata OK.");
  console.log(`Testobject: ${objectUrl}`);
  console.log(
    "\nOpen die URL in je browser. Als je een 403 ziet, activeer public access of een custom domain voor de bucket."
  );
}

main().catch((error) => {
  console.error("\nR2 test mislukt:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
