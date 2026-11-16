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
import { FileText, Heart, Loader2, MessageCircle, MoreHorizontal, Pencil, Pin, PinOff, Reply as ReplyIcon, Send, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostPoll } from "@/components/community/post-poll";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MentionField } from "@/components/community/mention-field";
import { ReactionBar, type ReactionSummary } from "@/components/community/reaction-bar";

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
    comments: Array<{
      id: string;
      content: string;
      createdAt: Date;
      parentId?: string | null;
      author: {
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        role: string;
      };
      attachments: Array<{
        id: string;
        url: string;
        type: string;
        duration: number | null;
      }>;
      reactions?: ReactionSummary[];
    }>;
    reactions?: ReactionSummary[];
    _count: {
      comments: number;
      likes: number;
    };
    isLiked: boolean;
  };
  currentUserId: string;
  currentUserRole?: string;
  currentUser?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  showSpace?: boolean;
}

export function PostCard({ post, currentUserId, currentUserRole, currentUser, showSpace = true }: PostCardProps) {
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
  const [reply, setReply] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; content: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongContent = post.content.length > 220 || post.content.split("\n").length > 4;
  const lastComment = post.comments[post.comments.length - 1];

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

  const handleReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reply.trim() || isReplying) return;

    setIsReplying(true);
    try {
      const response = await fetch(`/api/community/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim(), attachments: [], mentions: mentionedUserIds, parentId: replyTo?.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Je reactie kon niet worden geplaatst.");
      setReply("");
      setMentionedUserIds([]);
      setReplyTo(null);
      router.refresh();
    } catch (error) {
      toast({
        title: "Reactie niet geplaatst",
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsReplying(false);
    }
  };

  const renderComment = (comment: PostCardProps["post"]["comments"][number]) => (
    <div key={comment.id} className="group relative flex gap-3 pr-9">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={comment.author.avatarUrl || undefined} />
        <AvatarFallback className="bg-[#edf1ec] text-[10px] font-semibold text-[#173622]">
          {getInitials(comment.author.firstName, comment.author.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-xs font-semibold text-[#1d241f]">{comment.author.firstName} {comment.author.lastName}</span>
          <span className="text-[11px] text-[#8a918c]">· {formatRelativeTime(comment.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-[#404741]">{comment.content}</p>
        <ReactionBar
          endpoint={`/api/community/comments/${comment.id}/reactions`}
          initialReactions={comment.reactions ?? []}
          showLikeShortcut
          className="mt-2"
        />
      </div>
      <button
        type="button"
        onClick={() => setReplyTo({ id: comment.id, name: `${comment.author.firstName} ${comment.author.lastName}`, content: comment.content })}
        aria-label={`Reageer op ${comment.author.firstName}`}
        title={`Reageer op ${comment.author.firstName}`}
        className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center text-[#737b75] opacity-0 transition hover:bg-[#edf2ed] hover:text-[#173622] focus:opacity-100 group-hover:opacity-100 !min-h-0 !rounded-full"
      >
        <ReplyIcon className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <Card className={cn("community-round-card overflow-visible !rounded-2xl border-black/10 bg-white !shadow-[0_8px_28px_-22px_rgba(17,28,20,0.35)]", isPinned && "!border-[#173622]/35 !bg-[#fbfcfa]")}>
      <CardContent className="p-5 sm:p-6">
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
                  <span className="border-l border-[#173622]/30 pl-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#173622]">
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
                  className="h-8 gap-1 !rounded-full px-3 text-xs"
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
                  className="h-8 w-8 !rounded-full"
                  onClick={() => setShowActions((current) => !current)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {showActions ? (
                  <div className="absolute right-0 top-10 z-20 min-w-[180px] rounded-xl border border-black/10 bg-white p-2 shadow-[0_18px_45px_-28px_rgba(17,28,20,0.45)]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f5f6f3] !rounded-lg"
                      onClick={() => {
                        setIsEditing(true);
                        setShowActions(false);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Bericht bewerken
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 !rounded-lg"
                      onClick={() => {
                        setShowActions(false);
                        void handleDeletePost();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Bericht verwijderen
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
            <div className="space-y-3 rounded-xl border border-black/10 bg-[#fafaf8] p-4">
              <Input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Titel van het bericht (optioneel)"
                className="rounded-xl"
              />
              <Textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                placeholder="Schrijf je bericht"
                className="min-h-[140px] rounded-xl"
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
                  Annuleren
                </Button>
                <Button size="sm" onClick={handleSavePost} disabled={isSaving || !draftContent.trim()}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opslaan"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {post.title ? (
                <h3 className="text-base font-semibold leading-tight text-[#171b18]">
                  {post.title}
                </h3>
              ) : null}
              <p className={cn("max-w-[72ch] whitespace-pre-wrap text-sm leading-6 text-[#343a35]", isLongContent && !isExpanded && "line-clamp-3")}>{post.content}</p>
              {isLongContent ? (
                <button
                  type="button"
                  onClick={() => setIsExpanded((current) => !current)}
                  className="text-sm font-semibold text-[#173622] hover:underline !min-h-0"
                >
                  {isExpanded ? "Toon minder" : "Laat meer zien"}
                </button>
              ) : null}
            </div>
          )}

          {post.attachments.length > 0 && (
            <div className="grid gap-3">
              {post.attachments.map((attachment) => (
                <div key={attachment.id}>
                  {attachment.type === "image" && (
                    <img
                      src={attachment.url}
                      alt=""
                      className="max-h-96 w-auto rounded-xl"
                    />
                  )}
                  {attachment.type === "video" && (
                    <div className="overflow-hidden rounded-xl border border-black/10 bg-black">
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
                      className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#fafaf8] px-4 py-3 text-sm font-medium hover:border-[#173622]/30 hover:text-[#173622]"
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
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={handleLike}
              disabled={isLiking}
              aria-pressed={isLiked}
              aria-label="Vind ik leuk"
              className={cn(
                "inline-flex !h-8 items-center gap-1.5 border px-3 text-xs font-semibold transition !min-h-0 !rounded-full",
                isLiked
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-black/10 bg-white text-[#5d655f] hover:border-red-200 hover:text-red-500"
              )}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              <span>{likeCount}</span>
            </button>
            <ReactionBar
              endpoint={`/api/community/posts/${post.id}/reactions`}
              initialReactions={post.reactions ?? []}
              size="md"
            />
          </div>

          <span
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#5d655f]"
            title={`${post._count.comments} ${post._count.comments === 1 ? "reactie" : "reacties"}`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post._count.comments}</span>
            <span className="sr-only">{post._count.comments === 1 ? "reactie" : "reacties"}</span>
          </span>
        </div>

        {post.comments.length > 0 ? (
          <div className="border-t border-black/10 py-4">
            <Dialog>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#3d4640]">
                  Laatste reactie {formatRelativeTime(lastComment.createdAt).toLowerCase()}
                </p>
                {post.comments.length > 2 ? (
                  <DialogTrigger asChild>
                    <button type="button" className="text-xs font-semibold text-[#173622] underline-offset-4 hover:underline !min-h-0">
                      Alle {post.comments.length} reacties bekijken
                    </button>
                  </DialogTrigger>
                ) : null}
              </div>
              <DialogContent className="flex max-h-[86vh] max-w-2xl flex-col gap-0 overflow-hidden !rounded-3xl border-black/10 bg-white p-0 backdrop-blur-none">
                <DialogTitle className="sr-only">Alle reacties op {post.title || "dit bericht"}</DialogTitle>
                <DialogDescription className="sr-only">Bekijk de volledige conversatie en plaats een reactie.</DialogDescription>

                <div className="shrink-0 border-b border-black/10 px-6 py-5 pr-14">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={post.author.avatarUrl || undefined} />
                      <AvatarFallback className="bg-[#edf1ec] text-[10px] font-semibold text-[#173622]">
                        {getInitials(post.author.firstName, post.author.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold text-[#1d241f]">{post.author.firstName} {post.author.lastName}</p>
                      <p className="mt-0.5 text-[10px] text-[#7c847e]">{formatRelativeTime(post.createdAt)} · {post.space.name}</p>
                    </div>
                  </div>
                  {post.title ? <h3 className="mt-5 text-base font-semibold text-[#171b18]">{post.title}</h3> : null}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#343a35]">{post.content}</p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  <p className="mb-5 text-xs font-semibold text-[#68706a]">{post.comments.length} {post.comments.length === 1 ? "reactie" : "reacties"}</p>
                  <div className="space-y-5">
                    {post.comments.map(renderComment)}
                  </div>
                </div>

                <form onSubmit={handleReply} className="flex shrink-0 items-center gap-3 border-t border-black/10 bg-white px-5 py-4">
                  {replyTo ? (
                    <div className="absolute inset-x-5 bottom-[68px] flex items-center gap-2 !rounded-2xl border border-[#173622]/20 bg-[#f5f8f4] px-3 py-2 text-[10px] text-[#667068]">
                      <span>Reageer op</span>
                      <strong className="text-[#263129]">{replyTo.name}</strong>
                      <span className="min-w-0 flex-1 truncate">{replyTo.content}</span>
                      <button type="button" onClick={() => setReplyTo(null)} aria-label="Antwoord annuleren"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : null}
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={currentUser?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-[#edf1ec] text-[10px] font-semibold text-[#173622]">
                      {currentUser ? getInitials(currentUser.firstName, currentUser.lastName) : "IK"}
                    </AvatarFallback>
                  </Avatar>
                  <MentionField
                    value={reply}
                    onChange={setReply}
                    onMention={(userId) => setMentionedUserIds((current) => current.includes(userId) ? current : [...current, userId])}
                    spaceId={post.space.id}
                    placeholder="Schrijf een reactie..."
                    ariaLabel="Schrijf een reactie in de volledige conversatie. Typ apenstaartje om iemand te taggen."
                    className="h-12 w-full min-w-0 border border-black/10 bg-[#f6f8f6] px-5 text-sm outline-none transition placeholder:text-[#929a94] focus:border-[#173622]/40 focus:bg-white community-round-field !rounded-2xl"
                  />
                  <button type="submit" disabled={!reply.trim() || isReplying} aria-label="Reactie plaatsen" className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#173622] text-white transition hover:bg-[#21492e] disabled:cursor-not-allowed disabled:opacity-35 !rounded-full">
                    {isReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </DialogContent>
            </Dialog>
            <div className="space-y-5">
              {post.comments.slice(-2).map(renderComment)}
            </div>
          </div>
        ) : null}

        <form onSubmit={handleReply} className={cn("pt-2", post.comments.length === 0 && "border-t border-black/10 pt-4")}>
          {replyTo ? (
            <div className="mb-2 flex items-center gap-2 !rounded-2xl border border-[#173622]/20 bg-[#f5f8f4] px-3 py-2 text-[10px] text-[#667068]">
              <span>Reageer op</span>
              <strong className="text-[#263129]">{replyTo.name}</strong>
              <span className="min-w-0 flex-1 truncate">{replyTo.content}</span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Antwoord annuleren"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={currentUser?.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#edf1ec] text-[10px] font-semibold text-[#173622]">
              {currentUser ? getInitials(currentUser.firstName, currentUser.lastName) : "IK"}
            </AvatarFallback>
          </Avatar>
          <MentionField
            value={reply}
            onChange={setReply}
            onMention={(userId) => setMentionedUserIds((current) => current.includes(userId) ? current : [...current, userId])}
            spaceId={post.space.id}
            placeholder="Schrijf een reactie..."
            ariaLabel="Schrijf een reactie. Typ apenstaartje om iemand te taggen."
            className="h-12 w-full min-w-0 border border-black/10 bg-[#f6f8f6] px-5 text-sm outline-none transition placeholder:text-[#929a94] focus:border-[#173622]/40 focus:bg-white community-round-field !rounded-2xl"
          />
          <button
            type="submit"
            disabled={!reply.trim() || isReplying}
            aria-label="Reactie plaatsen"
            className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#173622] text-white transition hover:bg-[#21492e] disabled:cursor-not-allowed disabled:opacity-35 !rounded-full"
          >
            {isReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
