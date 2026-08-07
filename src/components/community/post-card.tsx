"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { FileText, Heart, Loader2, MessageCircle, MoreHorizontal, Pencil, Pin, PinOff, Trash2, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostPoll } from "@/components/community/post-poll";

interface PostCardProps {
  post: {
    id: string;
    title?: string | null;
    content: string;
    isPinned: boolean;
    createdAt: Date;
    author: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      role: string;
    };
    space: {
      id: string;
      name: string;
      slug: string;
      isHostOnly: boolean;
    };
    attachments: {
      id: string;
      url: string;
      type: string;
    }[];
    pollQuestion: string | null;
    poll: {
      totalVotes: number;
      userVote: number | null;
      options: Array<{
        index: number;
        label: string;
        votes: number;
      }>;
    } | null;
    _count: {
      comments: number;
      likes: number;
    };
    isLiked: boolean;
  };
  currentUserId: string;
  currentUserRole?: string;
  showSpace?: boolean;
}

export function PostCard({ post, currentUserId, currentUserRole, showSpace = true }: PostCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [isPinned, setIsPinned] = useState(post.isPinned);
  const [isPinning, setIsPinning] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(post.title || "");
  const [draftContent, setDraftContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLiking) return;
    setIsLiking(true);

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      const response = await fetch(`/api/community/posts/${post.id}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        // Revert on error
        setIsLiked(isLiked);
        setLikeCount(post._count.likes);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked);
      setLikeCount(post._count.likes);
    } finally {
      setIsLiking(false);
    }
  };

  const isAdmin = post.author.role === "ADMIN" || post.author.role === "SUPERADMIN";
  const canManagePin = currentUserRole === "ADMIN" || currentUserRole === "SUPERADMIN";
  const canManagePost = currentUserId === post.author.id;

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPinning || !canManagePin) return;

    setIsPinning(true);
    const nextValue = !isPinned;
    setIsPinned(nextValue);

    try {
      const response = await fetch(`/api/community/posts/${post.id}/pin`, {
        method: "PATCH",
      });

      if (!response.ok) {
        setIsPinned(!nextValue);
        return;
      }

      router.refresh();
    } catch (error) {
      setIsPinned(!nextValue);
    } finally {
      setIsPinning(false);
    }
  };

  const handleSavePost = async () => {
    if (!draftContent.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/community/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle.trim() || undefined,
          content: draftContent.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not update the post.");
      }

      setShowActions(false);
      setIsEditing(false);
      toast({ title: "Post updated", description: "Your changes are now live." });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not update the post.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/community/posts/${post.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not delete the post.");
      }

      toast({ title: "Post deleted", description: "The post was removed from the community." });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not delete the post.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={isPinned ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatarUrl || undefined} />
              <AvatarFallback className="bg-[#5b5fc7] text-xs font-semibold uppercase text-white">
                {getInitials(post.author.firstName, post.author.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {post.author.firstName} {post.author.lastName}
                </span>
                {isAdmin && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Simply
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatRelativeTime(post.createdAt)}</span>
                {showSpace && (
                  <>
                    <span>•</span>
                    <Link 
                      href={`/community/${post.space.slug}`}
                      className="hover:text-primary"
                    >
                      {post.space.name}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-1">
            {isPinned && (
              <Pin className="h-4 w-4 text-primary" />
            )}
            {canManagePin ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs"
                onClick={handleTogglePin}
                disabled={isPinning}
              >
                {isPinning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isPinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
                {isPinned ? "Unpin" : "Pin"}
              </Button>
            ) : null}
            {canManagePost ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowActions((current) => !current)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {showActions ? (
                  <div className="absolute right-0 top-10 z-20 min-w-[180px] rounded-2xl border bg-white p-2 shadow-xl">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/40"
                      onClick={() => {
                        setIsEditing(true);
                        setShowActions(false);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit post
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setShowActions(false);
                        void handleDeletePost();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete post
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div className="mb-4 space-y-4">
          {isEditing ? (
            <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <Input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Optional post title"
              />
              <Textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                placeholder="Post content"
                className="min-h-[140px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraftTitle(post.title || "");
                    setDraftContent(post.content);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSavePost} disabled={isSaving || !draftContent.trim()}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <Link href={`/community/post/${post.id}`} className="block space-y-3">
              {post.title ? (
                <h3 className="text-lg font-semibold leading-tight text-slate-950">
                  {post.title}
                </h3>
              ) : null}
              <p className="whitespace-pre-wrap">{post.content}</p>
            </Link>
          )}

          {post.attachments.length > 0 && (
            <div className="grid gap-3">
              {post.attachments.map((attachment) => (
                <div key={attachment.id}>
                  {attachment.type === "image" && (
                    <img
                      src={attachment.url}
                      alt=""
                      className="rounded-lg max-h-96 w-auto"
                    />
                  )}
                  {attachment.type === "video" && (
                    <div className="overflow-hidden rounded-2xl border bg-black">
                      <video controls src={attachment.url} className="max-h-[28rem] w-full" />
                    </div>
                  )}
                  {attachment.type === "voice_memo" && (
                    <audio controls src={attachment.url} className="w-full" />
                  )}
                  {attachment.type === "file" && (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border bg-muted/20 px-4 py-3 text-sm font-medium hover:border-primary/30 hover:text-primary"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="truncate">Open bijlage</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {post.poll && post.pollQuestion ? (
            <PostPoll
              postId={post.id}
              question={post.pollQuestion}
              options={post.poll.options}
              totalVotes={post.poll.totalVotes}
              userVote={post.poll.userVote}
            />
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-3 border-t">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            )}
          >
            <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            <span>{likeCount}</span>
          </button>

          <Link
            href={`/community/post/${post.id}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{post._count.comments}</span>
          </Link>

          <Link
            href={`/community/post/${post.id}`}
            className="ml-auto inline-flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80"
          >
            <Video className="h-4 w-4" />
            Bekijk post
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
