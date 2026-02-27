"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { getInitials } from "@/lib/utils";
import { Plus, Search, X, Loader2 } from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
}

interface NewConversationDialogProps {
  users: User[];
}

export function NewConversationDialog({ users }: NewConversationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const startConversation = async (userId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Kon gesprek niet starten");
      }

      const { conversationId } = await response.json();
      setIsOpen(false);
      router.push(`/messages/${conversationId}`);
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon gesprek niet starten",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-display text-lg tracking-wider">NIEUW GESPREK</h2>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek gebruiker..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => startConversation(user.id)}
                disabled={isLoading}
                className="flex items-center gap-3 w-full p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar>
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <span className="font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  {user.role === "ADMIN" && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Simply
                    </span>
                  )}
                  {user.role === "COACH" && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Coach
                    </span>
                  )}
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Geen gebruikers gevonden
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
