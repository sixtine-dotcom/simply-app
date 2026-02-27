"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Message {
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

interface ChatMessagesProps {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
}

export function ChatMessages({ conversationId, initialMessages, currentUserId }: ChatMessagesProps) {
  const [messages, setMessages] = useState(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new messages (replace with WebSocket/Pusher in production)
  useEffect(() => {
    const pollMessages = async () => {
      try {
        const response = await fetch(`/api/messages/conversations/${conversationId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to poll messages:", error);
      }
    };

    const interval = setInterval(pollMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  messages.forEach((message) => {
    const messageDate = new Date(message.createdAt).toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    if (messageDate !== currentDate) {
      currentDate = messageDate;
      groupedMessages.push({ date: messageDate, messages: [message] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-muted/30">
      {groupedMessages.map((group) => (
        <div key={group.date}>
          {/* Date Divider */}
          <div className="flex items-center justify-center mb-4">
            <span className="bg-white text-muted-foreground text-xs px-3 py-1 rounded-full shadow-sm">
              {group.date}
            </span>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {group.messages.map((message) => {
              const isOwn = message.senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2",
                    isOwn && "flex-row-reverse"
                  )}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(message.sender.firstName, message.sender.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      isOwn
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-white shadow-sm rounded-bl-sm"
                    )}
                  >
                    {message.voiceUrl ? (
                      <audio 
                        controls 
                        src={message.voiceUrl} 
                        className="max-w-[200px]"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isOwn ? "text-white/70" : "text-muted-foreground"
                      )}
                    >
                      {new Date(message.createdAt).toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            Nog geen berichten. Stuur het eerste bericht!
          </p>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
