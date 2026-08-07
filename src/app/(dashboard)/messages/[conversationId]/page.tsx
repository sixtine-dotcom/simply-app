import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getConversation, getConversationMessages } from "@/lib/messages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChatMessages } from "@/components/messages/chat-messages";
import { MessageInput } from "@/components/messages/message-input";
import { getInitials } from "@/lib/utils";
import { ChevronLeft, MoreVertical } from "lucide-react";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const conversation = await getConversation(conversationId, user.id);

  if (!conversation || !conversation.otherParticipant) {
    notFound();
  }

  const { messages } = await getConversationMessages(conversationId, user.id);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:h-screen md:p-4">
      {/* Header */}
      <div className="flex items-center gap-4 border-b bg-white p-4 md:rounded-t-[28px] md:border md:border-white/70 md:bg-[rgba(255,255,255,0.86)] md:backdrop-blur">
        <Link href="/messages" className="md:hidden">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>

        <Avatar>
          <AvatarImage src={conversation.otherParticipant.avatarUrl || undefined} />
          <AvatarFallback>
            {getInitials(
              conversation.otherParticipant.firstName,
              conversation.otherParticipant.lastName
            )}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <p className="app-kicker">Conversation</p>
          <h1 className="font-medium">
            {conversation.otherParticipant.firstName}{" "}
            {conversation.otherParticipant.lastName}
          </h1>
          {conversation.otherParticipant.role === "ADMIN" && (
            <span className="text-xs text-primary">Simply leeromgeving</span>
          )}
          {conversation.otherParticipant.role === "COACH" && (
            <span className="text-xs text-blue-600">Coach</span>
          )}
        </div>

        <Button variant="ghost" size="sm">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden md:border-x md:border-white/70 md:bg-[rgba(255,255,255,0.7)] md:backdrop-blur">
        <ChatMessages
          conversationId={conversationId}
          initialMessages={messages}
          currentUserId={user.id}
          isCoach={
            conversation.otherParticipant.role === "ADMIN" ||
            conversation.otherParticipant.role === "COACH" ||
            conversation.otherParticipant.role === "STAFF"
          }
        />
      </div>

      {/* Input */}
      <div className="md:rounded-b-[28px] md:border md:border-t-0 md:border-white/70 md:bg-[rgba(255,255,255,0.86)] md:backdrop-blur">
        <MessageInput
          conversationId={conversationId}
        />
      </div>
    </div>
  );
}
