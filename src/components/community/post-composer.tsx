"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { getInitials } from "@/lib/utils";
import { Image, Loader2, Send, X } from "lucide-react";

interface Space {
  id: string;
  name: string;
  slug: string;
  iconEmoji: string | null;
}

interface PostComposerProps {
  spaces: Space[];
  defaultSpaceId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  onSuccess?: () => void;
}

export function PostComposer({ spaces, defaultSpaceId, user, onSuccess }: PostComposerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [spaceId, setSpaceId] = useState(defaultSpaceId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          spaceId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kon post niet plaatsen");
      }

      setContent("");
      setIsFocused(false);
      
      toast({
        title: "Geplaatst!",
        description: "Je post is gedeeld met de community.",
      });

      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon post niet plaatsen",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback>
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="Deel iets met de community..."
              className="w-full resize-none border-0 bg-transparent p-0 focus:ring-0 focus:outline-none min-h-[60px] placeholder:text-muted-foreground"
              rows={isFocused ? 3 : 1}
            />

            {(isFocused || content) && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  {/* Space selector */}
                  <select
                    value={spaceId}
                    onChange={(e) => setSpaceId(e.target.value)}
                    className="text-sm border rounded-lg px-3 py-1.5 bg-muted"
                  >
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.iconEmoji} {space.name}
                      </option>
                    ))}
                  </select>

                  {/* Image upload button (placeholder) */}
                  <Button variant="ghost" size="sm" type="button">
                    <Image className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {content && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setContent("");
                        setIsFocused(false);
                      }}
                    >
                      Annuleren
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Plaatsen
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
