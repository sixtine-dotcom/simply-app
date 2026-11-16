import { createHash } from "node:crypto";
import { db } from "./db";

/** Atomic, shared across serverless instances; stores no raw email/IP. */
export async function takeAuthAttempt(scope: string, identifier: string, limit: number, windowMs = 15 * 60_000) {
  const key = createHash("sha256").update(`${scope}:${identifier}`).digest("hex");
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."resetAt" <= ${now} THEN 1 ELSE "AuthRateLimit"."attempts" + 1 END,
      "resetAt" = CASE WHEN "AuthRateLimit"."resetAt" <= ${now} THEN ${resetAt} ELSE "AuthRateLimit"."resetAt" END
    RETURNING "attempts"`;
  if (rows[0].attempts === 1) await db.authRateLimit.deleteMany({ where: { resetAt: { lt: new Date(now.getTime() - 24 * 60 * 60_000) } } });
  return rows[0].attempts <= limit;
}
