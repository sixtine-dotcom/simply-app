/**
 * Email Automation Sequences
 * Handles drip emails, welcome sequences, and enrollment notifications.
 */

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

type SequenceType = "welcome" | "enrollment" | "module_unlock" | "checkin_reminder" | "inactivity";

const SEQUENCES: Record<SequenceType, { delayDays: number; subject: string; bodyFn: (params: Record<string, string>) => string }[]> = {
  welcome: [
    {
      delayDays: 0,
      subject: "Welkom bij Simply 🎉",
      bodyFn: ({ firstName, platformName }) => `
        <p>Hoi ${firstName},</p>
        <p>Welkom bij <strong>${platformName}</strong>! We zijn blij dat je er bent.</p>
        <p>Je kunt nu inloggen en beginnen met je eerste cursus.</p>
        <p>Met vriendelijke groet,<br>Het ${platformName} team</p>
      `,
    },
    {
      delayDays: 3,
      subject: "Hoe gaat het tot nu toe?",
      bodyFn: ({ firstName, platformName }) => `
        <p>Hoi ${firstName},</p>
        <p>Je bent nu 3 dagen lid van ${platformName}. Hoe bevalt het?</p>
        <p>Herinner eraan dat je dagelijks je voeding, habits en symptomen kunt bijhouden in je trackers.</p>
        <p>Met vriendelijke groet,<br>Het ${platformName} team</p>
      `,
    },
    {
      delayDays: 7,
      subject: "Week 1 voltooid — hoe is je eerste week?",
      bodyFn: ({ firstName, platformName }) => `
        <p>Hoi ${firstName},</p>
        <p>Je eerste week bij ${platformName} zit erop! 🎉</p>
        <p>Vraag SIX AI om tips voor jouw specifieke situatie, of check de community voor inspiratie van medemembers.</p>
        <p>Met vriendelijke groet,<br>Het ${platformName} team</p>
      `,
    },
  ],
  enrollment: [
    {
      delayDays: 0,
      subject: "Je bent ingeschreven voor: {courseTitle}",
      bodyFn: ({ firstName, courseTitle, platformName }) => `
        <p>Hoi ${firstName},</p>
        <p>Goed nieuws! Je bent succesvol ingeschreven voor <strong>${courseTitle}</strong>.</p>
        <p>Log in op ${platformName} om meteen te starten.</p>
        <p>Met vriendelijke groet,<br>Het ${platformName} team</p>
      `,
    },
    {
      delayDays: 2,
      subject: "Hoe gaat het met {courseTitle}?",
      bodyFn: ({ firstName, courseTitle, platformName }) => `
        <p>Hoi ${firstName},</p>
        <p>Je bent nu 2 dagen bezig met <strong>${courseTitle}</strong>. Goed bezig!</p>
        <p>Vergeet niet dat je altijd vragen kunt stellen aan SIX AI of in de community.</p>
        <p>Met vriendelijke groet,<br>Het ${platformName} team</p>
      `,
    },
  ],
  module_unlock: [
    {
      delayDays: 0,
      subject: "Nieuwe module beschikbaar: {moduleTitle}",
      bodyFn: ({ firstName, moduleTitle, courseTitle, platformName }) => `
        <p>Hoi ${firstName},</p>
        <p>Geweldig nieuws! Een nieuwe module is beschikbaar in <strong>${courseTitle}</strong>:</p>
        <p><strong>${moduleTitle}</strong></p>
        <p>Log in om direct te starten!</p>
        <p>Met vriendelijke groet,<br>Het ${platformName} team</p>
      `,
    },
  ],
  checkin_reminder: [
    {
      delayDays: 0,
      subject: "Vergeet je wekelijkse check-in niet 📊",
      bodyFn: ({ firstName, platformName }) => `
        <p>Hoi ${firstName},</p>
        <p>Deze week heb je nog geen wekelijkse check-in gedaan. Neem even de tijd om je gewicht, maten en energie bij te houden.</p>
        <p>Consistentie is de sleutel tot resultaten! 💪</p>
        <p>Met vriendelijke groet,<br>Het ${platformName} team</p>
      `,
    },
  ],
  inactivity: [
    {
      delayDays: 0,
      subject: "We missen je! Kom terug bij {platformName} 👋",
      bodyFn: ({ firstName, platformName }) => `
        <p>Hoi ${firstName},</p>
        <p>We hebben je al een tijdje niet gezien op ${platformName}. Alles goed?</p>
        <p>Je cursussen, community en trackers staan op je te wachten.</p>
        <p>Met vriendelijke groet,<br>Het ${platformName} team</p>
      `,
    },
  ],
};

export async function sendWelcomeSequenceEmail(
  userId: string,
  step: 0 | 1 | 2
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { tenant: { include: { settings: true } } },
  });

  if (!user) return;

  const sequence = SEQUENCES.welcome[step];
  if (!sequence) return;

  const platformName = user.tenant?.settings?.platformName || user.tenant?.name || "Simply";

  await sendEmail({
    to: user.email,
    subject: sequence.subject,
    html: sequence.bodyFn({ firstName: user.firstName, platformName }),
  });
}

export async function sendEnrollmentSequenceEmail(
  userId: string,
  courseId: string,
  step: 0 | 1
) {
  const [user, course] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: { tenant: { include: { settings: true } } },
    }),
    db.course.findUnique({ where: { id: courseId }, select: { title: true } }),
  ]);

  if (!user || !course) return;

  const sequence = SEQUENCES.enrollment[step];
  if (!sequence) return;

  const platformName = user.tenant?.settings?.platformName || user.tenant?.name || "Simply";

  await sendEmail({
    to: user.email,
    subject: sequence.subject.replace("{courseTitle}", course.title),
    html: sequence.bodyFn({
      firstName: user.firstName,
      courseTitle: course.title,
      platformName,
    }),
  });
}

export async function sendModuleUnlockEmail(
  userId: string,
  moduleId: string
) {
  const [user, mod] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: { tenant: { include: { settings: true } } },
    }),
    db.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { title: true } } },
    }),
  ]);

  if (!user || !mod) return;

  const sequence = SEQUENCES.module_unlock[0];
  const platformName = user.tenant?.settings?.platformName || user.tenant?.name || "Simply";

  await sendEmail({
    to: user.email,
    subject: sequence.subject.replace("{moduleTitle}", mod.title),
    html: sequence.bodyFn({
      firstName: user.firstName,
      moduleTitle: mod.title,
      courseTitle: mod.course.title,
      platformName,
    }),
  });
}

export async function sendInactivityEmails(inactiveSince: Date) {
  const inactiveUsers = await db.user.findMany({
    where: {
      deletedAt: null,
      role: "CLIENT",
      lastLoginAt: { lt: inactiveSince, not: null },
    },
    include: { tenant: { include: { settings: true } } },
    take: 100,
  });

  for (const user of inactiveUsers) {
    const sequence = SEQUENCES.inactivity[0];
    const platformName = user.tenant?.settings?.platformName || user.tenant?.name || "Simply";

    await sendEmail({
      to: user.email,
      subject: sequence.subject.replace("{platformName}", platformName),
      html: sequence.bodyFn({ firstName: user.firstName, platformName }),
    }).catch(() => {});
  }

  return { sent: inactiveUsers.length };
}
