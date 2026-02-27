import { db } from "./db";

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
export async function getUserConversations(userId: string): Promise<ConversationWithDetails[]> {
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

  return participations.map((p) => {
    const otherParticipant = p.conversation.participants.find(
      (part) => part.userId !== userId
    );

    // Count unread messages
    const unreadCount = p.lastReadAt
      ? 0 // We'll calculate this properly in a production app
      : 0;

    return {
      id: p.conversation.id,
      lastMessageAt: p.conversation.lastMessageAt,
      updatedAt: p.conversation.updatedAt,
      otherParticipant: otherParticipant?.user || {
        id: "",
        firstName: "Verwijderd",
        lastName: "Gebruiker",
        avatarUrl: null,
        role: "CLIENT",
      },
      lastMessage: p.conversation.messages[0] || null,
      unreadCount,
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
  // Check if conversation exists
  const existingParticipation = await db.conversationParticipant.findFirst({
    where: {
      userId: userId1,
      conversation: {
        participants: {
          some: {
            userId: userId2,
          },
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
  // Verify user is participant
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new Error("Geen toegang tot dit gesprek");
  }

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
  // Verify sender is participant
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: senderId,
      },
    },
  });

  if (!participant) {
    throw new Error("Geen toegang tot dit gesprek");
  }

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
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
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
                },
              },
            },
          },
        },
      },
    },
  });

  if (!participant) {
    return null;
  }

  const otherParticipant = participant.conversation.participants.find(
    (p) => p.userId !== userId
  );

  return {
    id: participant.conversation.id,
    otherParticipant: otherParticipant?.user || null,
  };
}
