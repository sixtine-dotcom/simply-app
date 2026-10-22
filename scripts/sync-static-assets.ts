// Run with local environment loaded. The manifest contains public URLs only; media stay out of Git.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createR2UploadUrl } from "../src/lib/r2";
const types: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };
async function main() {
  const assets: Record<string, string> = {};
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === "uploads") continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(file); continue; }
      const contentType = types[path.extname(file).toLowerCase()];
      if (!contentType) continue;
      const body = await readFile(file);
      const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
      const relative = file.slice("public/".length);
      const { url, uploadUrl } = await createR2UploadUrl({ key: `app-assets/${hash}/${relative}`, contentType });
      // curl also works on Macs whose Node TLS stack cannot negotiate with R2.
      // Pass the signed URL through stdin rather than exposing it in process arguments.
      const uploaded = spawnSync("curl", ["--http1.1", "--header", "Expect: 100-continue", "--config", "-", "--fail", "--silent", "--show-error", "--retry", "4", "--retry-all-errors", "--limit-rate", "500K", "--upload-file", file, "--header", `Content-Type: ${contentType}`], { input: `url = ${JSON.stringify(uploadUrl)}\n`, encoding: "utf8" });
      if (uploaded.status !== 0) { console.error("Asset", relative, "upload failed:", uploaded.stderr.replace(/https?:\/\/\S+/g, "[URL]")); throw new Error("Asset upload failed"); }
      assets[`/${relative}`] = url;
    }
  }
  await walk("public");
  await writeFile("src/lib/static-assets.json", JSON.stringify(assets, null, 2) + "\n");
  console.log(`Stored ${Object.keys(assets).length} static assets in R2; public URL manifest written.`);
}
main().catch((error) => { console.error("Static asset upload failed", error.name, error.code, error.$metadata?.httpStatusCode); process.exitCode = 1; });
