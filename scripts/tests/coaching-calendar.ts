import assert from "node:assert/strict";
import { createCoachingCalendarToken, readCoachingCalendarToken, generateCoachingCalendar } from "../../src/lib/coaching-calendar";

process.env.AUTH_SECRET = "calendar-test-secret";
const token = createCoachingCalendarToken("client-a", "tenant-a");
assert.deepEqual(readCoachingCalendarToken(token), { userId: "client-a", tenantId: "tenant-a" });
assert.equal(readCoachingCalendarToken(token + ".extra"), null);
const [payload, sig] = token.split(".");
const forged = Buffer.from(JSON.stringify({ userId: "client-b", tenantId: "tenant-a" })).toString("base64url");
assert.equal(readCoachingCalendarToken(`${forged}.${sig}`), null);
assert.equal(readCoachingCalendarToken(`${payload}.${sig.slice(1)}`), null);
assert.equal(readCoachingCalendarToken("not-a-token"), null);
assert.equal(readCoachingCalendarToken("x".repeat(3000)), null);
assert.deepEqual(readCoachingCalendarToken(createCoachingCalendarToken("client-a", null)), { userId: "client-a", tenantId: null });

const sessions = Array.from({ length: 15 }, (_, index) => ({
  id: `session-${index}`, title: "Coaching, samen; verder", description: "Eerste regel\nTweede regel",
  scheduledAt: new Date("2026-11-17T19:30:00+01:00"), duration: 60,
  status: index === 14 ? "cancelled" : "scheduled", updatedAt: new Date("2026-11-16T12:00:00Z"),
}));
const calendar = generateCoachingCalendar(sessions, "https://example.com");
assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 15, "Must export more than the ten sessions shown on the overview");
assert(calendar.includes("DTSTART:20261117T183000Z"));
assert(calendar.includes("DTEND:20261117T193000Z"));
assert(calendar.includes("STATUS:CANCELLED"));
assert(calendar.includes("METHOD:PUBLISH"));
assert(calendar.includes("TRIGGER:-PT15M"));
assert(calendar.includes("UID:coaching-session-0@simplyapp"));
assert(calendar.includes("https://example.com/coaching/session-0/room"));
assert.equal((generateCoachingCalendar(sessions, "https://example.com").match(/^UID:.*$/gm) || []).join(), (calendar.match(/^UID:.*$/gm) || []).join(), "Repeated downloads must retain event identities");
assert(!calendar.includes("ATTENDEE"), "Personal feed must not expose other clients' addresses");
assert(!calendar.includes("ORGANIZER"));
assert(generateCoachingCalendar([], "https://example.com").includes("BEGIN:VCALENDAR"));
process.env.AUTH_SECRET = "rotated-secret";
assert.equal(readCoachingCalendarToken(token), null, "Changing the signing key invalidates existing subscriptions");
console.log("PASS: signed client/tenant identity, tampering rejection, all events, UTC times, cancellation, stable IDs and reminders");
