import { db } from "./db";
import { canDirectMessage, MESSAGE_TEAM_ROLES, isMessagingTeamRole, MessageAccessError } from "./message-policy";

const messagingUserSelect = {
  id: true, firstName: true, lastName: true, avatarUrl: true,
  role: true, tenantId: true, deletedAt: true,
} as const;

/** The same access check protects pages, polling, history and sending. */
async function requireAllowedConversation(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { include: { user: { select: messagingUserSelect } } } },
  });
  const actor = conversation?.participants.find((p) => p.userId === userId);
  const other = conversation?.participants.find((p) => p.userId !== userId);
  if (!conversation || conversation.participants.length !== 2 || !actor || !other || !canDirectMessage(actor.user, other.user)) {
    throw new MessageAccessError();
  }
  return { conversation, other: other.user };
}

export async function getMessagingContacts(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) return [];
  return db.user.findMany({
    where: {
      id: { not: userId }, tenantId: user.tenantId, deletedAt: null,
      ...(isMessagingTeamRole(user.role) ? {} : { role: { in: [...MESSAGE_TEAM_ROLES] } }),
    },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
    orderBy: { firstName: "asc" },
  });
}

export interface ConversationWithDetails {
  id: string;
  lastMessageAt: Date | null;
  updatedAt: Date;
  otherParticipant: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  };
  lastMessage: {
    content: string;
    createdAt: Date;
    senderId: string;
  } | null;
  unreadCount: number;
  isCoach: boolean;
}

export interface MessageWithSender {
  id: string;
  content: string;
  voiceUrl: string | null;
  voiceDuration: number | null;
  createdAt: Date;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string,
  coachIds: string[] = []
): Promise<ConversationWithDetails[]> {
  const actor = await db.user.findUnique({ where: { id: userId }, select: messagingUserSelect });
  if (!actor || actor.deletedAt) return [];
  const participations = await db.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  role: true,
                  tenantId: true,
                  deletedAt: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
      },
    },
    orderBy: {
      conversation: {
        lastMessageAt: "desc",
      },
    },
  });

  return participations.filter((p) => {
    const other = p.conversation.participants.find((part) => part.userId !== userId);
    return p.conversation.participants.length === 2 && other && canDirectMessage(actor, other.user);
  }).map((p) => {
    const otherParticipant = p.conversation.participants.find(
      (part) => part.userId !== userId
    );

    // Count unread messages
    const unreadCount = p.lastReadAt
      ? 0 // We'll calculate this properly in a production app
      : 0;

    const other = otherParticipant?.user || {
      id: "",
      firstName: "Verwijderd",
      lastName: "Gebruiker",
      avatarUrl: null,
      role: "CLIENT",
    };
    // Coach is de specifiek toegewezen coach van het traject (of ADMIN/COACH rol als fallback)
    const isCoach =
      coachIds.length > 0
        ? coachIds.includes(other.id)
        : other.role === "ADMIN" || other.role === "COACH";

    return {
      id: p.conversation.id,
      lastMessageAt: p.conversation.lastMessageAt,
      updatedAt: p.conversation.updatedAt,
      otherParticipant: { id: other.id, firstName: other.firstName, lastName: other.lastName, avatarUrl: other.avatarUrl, role: other.role },
      lastMessage: p.conversation.messages[0] || null,
      unreadCount,
      isCoach,
    };
  });
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  const [first, second] = await Promise.all([
    db.user.findUnique({ where: { id: userId1 }, select: messagingUserSelect }),
    db.user.findUnique({ where: { id: userId2 }, select: messagingUserSelect }),
  ]);
  if (!first || !second || !canDirectMessage(first, second)) throw new MessageAccessError();
  // Check if conversation exists
  const existingParticipation = await db.conversationParticipant.findFirst({
    where: {
      userId: userId1,
      conversation: {
        participants: {
          some: {
            userId: userId2,
          },
          every: { userId: { in: [userId1, userId2] } },
        },
      },
    },
    include: {
      conversation: {
        include: {
          participants: true,
        },
      },
    },
  });

  if (existingParticipation && existingParticipation.conversation.participants.length === 2) {
    return existingParticipation.conversation.id;
  }

  // Create new conversation
  const conversation = await db.conversation.create({
    data: {
      participants: {
        create: [
          { userId: userId1 },
          { userId: userId2 },
        ],
      },
    },
  });

  return conversation.id;
}

/**
 * Get messages in a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  userId: string,
  limit = 50,
  cursor?: string
): Promise<{ messages: MessageWithSender[]; nextCursor: string | null }> {
  await requireAllowedConversation(conversationId, userId);

  const where: any = { conversationId };
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const messages = await db.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Update last read
  await db.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    data: { lastReadAt: new Date() },
  });

  const hasMore = messages.length > limit;
  const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: messagesToReturn.reverse(), // Return in chronological order
    nextCursor: hasMore
      ? messagesToReturn[0].createdAt.toISOString()
      : null,
  };
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  voiceUrl?: string,
  voiceDuration?: number
) {
  await requireAllowedConversation(conversationId, senderId);

  const message = await db.message.create({
    data: {
      conversationId,
      senderId,
      content,
      voiceUrl,
      voiceDuration,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Update conversation lastMessageAt
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Update sender's lastReadAt
  await db.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId: senderId,
      },
    },
    data: { lastReadAt: new Date() },
  });

  return message;
}

/**
 * Get conversation details
 */
export async function getConversation(conversationId: string, userId: string) {
  try {
    const { conversation, other } = await requireAllowedConversation(conversationId, userId);
    return {
      id: conversation.id,
      otherParticipant: { id: other.id, firstName: other.firstName, lastName: other.lastName, avatarUrl: other.avatarUrl, role: other.role },
    };
  } catch (error) {
    if (error instanceof MessageAccessError) return null;
    throw error;
  }
}
