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
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-white">
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
          <h1 className="font-medium">
            {conversation.otherParticipant.firstName}{" "}
            {conversation.otherParticipant.lastName}
          </h1>
          {conversation.otherParticipant.role === "ADMIN" && (
            <span className="text-xs text-primary">Simply</span>
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
      <ChatMessages 
        conversationId={conversationId}
        initialMessages={messages}
        currentUserId={user.id}
      />

      {/* Input */}
      <MessageInput 
        conversationId={conversationId}
      />
    </div>
  );
}
