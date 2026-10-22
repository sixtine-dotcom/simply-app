import assert from "node:assert/strict";
import { advanceScheduledSocialPosts } from "../../src/lib/scheduled-social-posts";
import { scheduleInput, socialInput } from "../../src/lib/social-schedule-input";

type Job = { id: string; platform: string; status: string; remoteId?: string; userId: string; caption: string; format: string; media: unknown[]; user: { role: string }; claimedAt?: Date; lastError?: string };
const job = (id: string, platform: string): Job => ({ id, platform, status: "SCHEDULED", userId: "admin", caption: "Test", format: "reel", media: [{ url: "https://media.example.com/test.mp4", type: "video" }], user: { role: "ADMIN" } });
const jobs = [job("ig", "instagram"), job("fb", "facebook"), job("tt", "tiktok")];
const calls: string[] = [];
const mock = {
  db: { socialPublication: {
    findMany: async () => jobs.filter((j) => ["SCHEDULED", "PROCESSING"].includes(j.status)).map((j) => ({ ...j })),
    updateMany: async ({ where, data }: any) => {
      const matched = jobs.filter((j) => where.id ? j.id === where.id && j.status === where.status : j.status === "CLAIMED" && j.claimedAt && j.claimedAt < where.claimedAt.lt);
      matched.forEach((j) => Object.assign(j, data)); return { count: matched.length };
    },
    update: async ({ where, data }: any) => Object.assign(jobs.find((j) => j.id === where.id)!, data),
  } },
  publishSocial: async (input: any) => {
    const platform = input.platforms[0]; calls.push(platform);
    if (platform === "facebook") return { errors: { facebook: "Test failure" } };
    if (platform === "tiktok") { await input.onTikTokInitialized("tt-id"); return { tiktokPublishId: "tt-id", tiktokStatus: "PROCESSING", errors: {} }; }
    return { instagramId: "ig-id", errors: {} };
  },
  getValidTikTokToken: async () => "test-token",
  getTikTokPublishStatus: async () => ({ status: "PUBLISH_COMPLETE" }),
} as unknown as NonNullable<Parameters<typeof advanceScheduledSocialPosts>[0]>;

async function main() {
  await Promise.all([advanceScheduledSocialPosts(mock), advanceScheduledSocialPosts(mock)]);
  assert.equal(calls.filter((c) => c === "instagram").length, 1, "Concurrent workers must not duplicate Instagram");
  assert.equal(calls.filter((c) => c === "facebook").length, 1);
  assert.equal(calls.filter((c) => c === "tiktok").length, 1);
  assert.equal(jobs[0].status, "PUBLISHED"); assert.equal(jobs[1].status, "FAILED"); assert.equal(jobs[2].status, "PROCESSING");
  await advanceScheduledSocialPosts(mock);
  assert.equal(jobs[2].status, "PUBLISHED", "TikTok completion must be polled, not re-uploaded");
  assert.equal(calls.length, 3, "Completed/failed deliveries are not retried automatically");
  jobs.push({ ...job("stale", "instagram"), status: "CLAIMED", claimedAt: new Date(0) });
  await advanceScheduledSocialPosts(mock);
  assert.equal(jobs[3].status, "REVIEW", "Ambiguous timeout must require review, not duplicate a post");
  const video = { url: "https://media.example.com/test.mp4", type: "video" };
  assert(socialInput.safeParse({ media: [video], platforms: ["instagram", "facebook", "tiktok"] }).success);
  assert(!socialInput.safeParse({ media: [{ ...video, type: "image" }], platforms: ["tiktok"] }).success);
  assert(!socialInput.safeParse({ media: [{ ...video, url: "https://127.0.0.1/private" }], platforms: ["tiktok"] }).success);
  assert(!socialInput.safeParse({ media: [video], platforms: [] }).success);
  const draft = { video: { id: "video", name: "Video", mimeType: "video/mp4", modifiedTime: new Date().toISOString(), mediaUrls: [video.url] }, categoryId: "c", savedAt: new Date().toISOString(), publications: [{ id: "p", scheduledAt: "2026-10-25T19:30:00+01:00", platforms: ["tiktok"], caption: "TikTok caption" }] };
  assert(scheduleInput.safeParse(draft).success);
  assert(!scheduleInput.safeParse({ ...draft, publications: [draft.publications[0], draft.publications[0]] }).success);
  assert(!scheduleInput.safeParse({ ...draft, publications: [{ ...draft.publications[0], scheduledAt: "2026-10-25T19:30" }] }).success, "Persisted dates need an explicit timezone");
  console.log("PASS: concurrent claims, channel isolation, no duplicate retries, TikTok polling, timeout recovery, media/platform validation and timezone-safe input");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
