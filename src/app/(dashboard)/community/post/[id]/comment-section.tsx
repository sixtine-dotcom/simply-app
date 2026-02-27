"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { Loader2, Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  };
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  currentUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  canComment: boolean;
}

export function CommentSection({ postId, comments: initialComments, currentUser, canComment }: CommentSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) {
        throw new Error("Kon reactie niet plaatsen");
      }

      const comment = await response.json();
      setComments([...comments, comment]);
      setNewComment("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon reactie niet plaatsen",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-lg tracking-wider mb-4">
        REACTIES ({comments.length})
      </h2>

      {/* Comment Form */}
      {canComment && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit}>
              <div className="flex gap-3">
                <Avatar>
                  <AvatarImage src={currentUser.avatarUrl || undefined} />
                  <AvatarFallback>
                    {getInitials(currentUser.firstName, currentUser.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Schrijf een reactie..."
                    className="w-full resize-none border rounded-lg p-3 min-h-[80px] focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <div className="flex justify-end mt-2">
                    <Button type="submit" size="sm" disabled={!newComment.trim() || isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Reageer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nog geen reacties. {canComment && "Wees de eerste!"}
          </p>
        )}
      </div>
    </div>
  );
}

function CommentCard({ comment }: { comment: Comment }) {
  const isAdmin = comment.author.role === "ADMIN";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src={comment.author.avatarUrl || undefined} />
            <AvatarFallback>
              {getInitials(comment.author.firstName, comment.author.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">
                {comment.author.firstName} {comment.author.lastName}
              </span>
              {isAdmin && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Simply
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{comment.content}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
