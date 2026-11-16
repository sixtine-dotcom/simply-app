import { createHmac } from "node:crypto";
import { db } from "./db";

export function deletionEmailDigest(email: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return createHmac("sha256", secret).update(`account-deletion:${email.trim().toLowerCase()}`).digest("hex");
}

export function collectUploadLinks(value: unknown, result = new Set<string>()): string[] {
  if (typeof value === "string") {
    if (value.startsWith("/uploads/") || /^https?:\/\//.test(value) && /\.(pdf|png|jpe?g|webp|gif|mp4|webm|mp3|m4a)(\?|$)/i.test(value)) result.add(value);
  } else if (Array.isArray(value)) for (const item of value) collectUploadLinks(item, result);
  else if (value && typeof value === "object") for (const item of Object.values(value)) collectUploadLinks(item, result);
  return [...result];
}

export async function deletionResources(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: {
    avatarUrl: true,
    progressPhotos: { select: { beforePhotoUrl: true, afterPhotoUrl: true } },
    nutritionPlans: { select: { fileUrl: true } },
    posts: { select: { attachments: { select: { url: true } } } },
    comments: { select: { attachments: { select: { url: true } } } },
    messages: { select: { voiceUrl: true } },
    whatsappMessages: { select: { mediaUrl: true } },
    customRecipes: { select: { imageUrl: true } },
    formResponses: { select: { answers: { select: { value: true } } } },
    fitnessConnections: { select: { provider: true } },
    calendarConnections: { select: { provider: true } },
    integrationConnections: { select: { provider: true } },
    sessionsAsClient: { select: { recordings: { select: { dailyRecordingId: true, googleDriveWebViewLink: true } } } },
  } });
  const privateConversations = await db.conversation.findMany({
    where: { participants: { some: { userId } } },
    select: { _count: { select: { participants: true } }, messages: { select: { voiceUrl: true } } },
  });
  return user ? {
    files: collectUploadLinks([user, privateConversations.filter(c => c._count.participants <= 2)]),
    services: [...user.fitnessConnections, ...user.calendarConnections, ...user.integrationConnections].map(c => c.provider),
    recordings: user.sessionsAsClient.flatMap(s => s.recordings),
  } : { files: [], services: [], recordings: [] };
}

/** Called by an authenticated operator only after external-file/service review. */
export async function eraseRequestedClientAccount(requestId: string, confirmationEmail: string, externalDataReviewed: boolean) {
  if (!externalDataReviewed) throw new Error("Controleer en verwerk eerst persoonlijke bestanden en externe diensten.");
  return db.$transaction(async tx => {
    const request = await tx.accountDeletionRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Verzoek niet gevonden.");
    if (request.status === "COMPLETED") return { alreadyCompleted: true, confirmationEmail: null };
    if (!request.userId || !request.email || request.email.toLowerCase() !== confirmationEmail.trim().toLowerCase()) throw new Error("Het bevestigde e-mailadres komt niet overeen.");
    const user = await tx.user.findUnique({ where: { id: request.userId }, include: { _count: { select: { coursesAsCoach: true, sessionsAsCoach: true, hostedRecordings: true, webinarsHosted: true, emailCampaigns: true } } } });
    if (!user || user.role !== "CLIENT" || Object.values(user._count).some(count => count > 0)) throw new Error("Dit account beheert gedeelde inhoud. Handmatige beoordeling is nodig.");
    const sharedRecording = await tx.coachingRecording.findFirst({ where: {
      session: { clientId: user.id }, OR: [{ courseId: { not: null } }, { recurrenceOccurrenceKey: { not: null } }],
    }, select: { id: true } });
    if (sharedRecording) throw new Error("Een gekoppelde opname wordt gedeeld met een groep. Anonimiseer en ontkoppel die eerst handmatig.");
    await tx.coachingRecording.deleteMany({ where: { session: { clientId: user.id } } });
    // Remove records stored by email or a plain ID instead of a User foreign key.
    await tx.verificationToken.deleteMany({ where: { email: user.email } });
    await tx.emailCampaignRecipient.deleteMany({ where: { email: user.email } });
    await tx.emailSuppression.deleteMany({ where: { email: user.email } });
    await tx.webinarRegistration.deleteMany({ where: { OR: [{ userId: user.id }, { email: user.email }] } });
    await tx.offerLead.deleteMany({ where: { email: user.email } });
    await tx.postLike.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.deleteMany({ where: { OR: [
      { userId: user.id },
      ...["targetUserId", "email", "targetUserEmail"].map(key => ({ metadata: { path: [key], equals: key === "targetUserId" ? user.id : user.email } })),
    ] } });
    // A coach's replies can contain the client's private information too.
    const conversations = await tx.conversation.findMany({
      where: { participants: { some: { userId: user.id } } },
      select: { id: true, _count: { select: { participants: true } } },
    });
    await tx.conversation.deleteMany({ where: { id: { in: conversations.filter(c => c._count.participants <= 2).map(c => c.id) } } });
    // Cascades cover profile/health data, forms, trackers, AI conversations,
    // course access, messages, posts, integrations and sessions.
    await tx.user.delete({ where: { id: user.id } });
    await tx.accountDeletionRequest.update({ where: { id: requestId }, data: { userId: null, email: null, status: "COMPLETED", completedAt: new Date() } });
    await tx.auditLog.create({ data: { action: "privacy.account_erased", tenantId: request.tenantId, metadata: { requestId } } });
    return { alreadyCompleted: false, confirmationEmail: user.email };
  }, { timeout: 20_000 });
}
