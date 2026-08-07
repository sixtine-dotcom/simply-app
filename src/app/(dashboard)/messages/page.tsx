import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserConversations, getOrCreateConversation } from "@/lib/messages";
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

  // Voor klanten: zorg dat het gesprek met de coach altijd bestaat
  const coachIds: string[] = [];
  if (user.role === "CLIENT") {
    const enrollmentsWithCoach = await db.enrollment.findMany({
      where: {
        userId: user.id,
        course: { coachId: { not: null } },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      include: {
        course: { select: { coachId: true } },
      },
    });

    for (const enrollment of enrollmentsWithCoach) {
      const coachId = enrollment.course.coachId;
      if (coachId && !coachIds.includes(coachId)) {
        coachIds.push(coachId);
        await getOrCreateConversation(user.id, coachId);
      }
    }
  }

  const rawConversations = await getUserConversations(user.id, coachIds);
  // Coach-gesprek altijd bovenaan, daarna op recentheid
  const conversations = [...rawConversations].sort((a, b) => {
    if (a.isCoach && !b.isCoach) return -1;
    if (!a.isCoach && b.isCoach) return 1;
    const aTime = a.lastMessageAt?.getTime() ?? a.updatedAt.getTime();
    const bTime = b.lastMessageAt?.getTime() ?? b.updatedAt.getTime();
    return bTime - aTime;
  });

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
    <div className="flex h-[calc(100vh-4rem)] md:h-screen md:p-4">
      {/* Conversations List */}
      <div className="flex w-full flex-col border-r bg-white md:w-80 md:overflow-hidden md:rounded-[28px] md:border md:border-white/70 md:bg-[rgba(255,255,255,0.86)] md:shadow-[0_24px_80px_-34px_rgba(50,32,14,0.28)] md:backdrop-blur">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="app-kicker">Inbox</p>
              <h1 className="mt-1 font-display text-xl tracking-tight text-slate-950">Berichten</h1>
            </div>
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
          {conversations.length > 0 || coachIds.length > 0 ? (
            <div className="divide-y">
              {conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className={`flex items-center gap-3 p-4 transition-colors hover:bg-muted/50 ${conversation.isCoach ? "bg-primary/5 border-b border-primary/10" : ""}`}
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium truncate">
                          {conversation.isCoach
                            ? "Coach"
                            : `${conversation.otherParticipant.firstName} ${conversation.otherParticipant.lastName}`}
                        </span>
                        {conversation.isCoach && (
                          <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Vast
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTime(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage ? (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage.senderId === user.id && "Jij: "}
                        {conversation.lastMessage.content}
                      </p>
                    ) : conversation.isCoach ? (
                      <p className="text-sm text-muted-foreground italic">Hier vind je berichten van je coach</p>
                    ) : null}
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
      <div className="hidden md:flex flex-1 items-center justify-center rounded-[32px] bg-[rgba(255,255,255,0.55)] backdrop-blur">
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
