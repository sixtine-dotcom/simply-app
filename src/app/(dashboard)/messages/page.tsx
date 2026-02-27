import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserConversations } from "@/lib/messages";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { MessageSquare, Search, Plus, Users } from "lucide-react";
import { NewConversationDialog } from "@/components/messages/new-conversation-dialog";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const conversations = await getUserConversations(user.id);

  // Get users for new conversation (exclude self)
  const users = await db.user.findMany({
    where: {
      id: { not: user.id },
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen">
      {/* Conversations List */}
      <div className="w-full md:w-80 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-xl tracking-wider">BERICHTEN</h1>
            <NewConversationDialog users={users} />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek gesprek..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 ? (
            <div className="divide-y">
              {conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={conversation.otherParticipant.avatarUrl || undefined} />
                    <AvatarFallback>
                      {getInitials(
                        conversation.otherParticipant.firstName,
                        conversation.otherParticipant.lastName
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">
                        {conversation.otherParticipant.firstName}{" "}
                        {conversation.otherParticipant.lastName}
                      </span>
                      {conversation.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage.senderId === user.id && "Jij: "}
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Nog geen gesprekken
              </p>
              <p className="text-sm text-muted-foreground">
                Start een nieuw gesprek met iemand uit de community!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Empty State (Desktop) */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-muted/30">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <h2 className="mt-4 font-display text-xl tracking-wider text-muted-foreground">
            SELECTEER EEN GESPREK
          </h2>
          <p className="mt-2 text-muted-foreground">
            Kies een gesprek uit de lijst of start een nieuw gesprek
          </p>
        </div>
      </div>
    </div>
  );
}
