import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPost } from "@/lib/community";
import { PostCommentsControl } from "@/components/community/post-comments-control";
import { PinToggleButton } from "./pin-toggle-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostLikeButton } from "./like-button";
import { CommentSection } from "./comment-section";
import { PostPoll } from "@/components/community/post-poll";
import { formatRelativeTime, formatDateTime, getInitials } from "@/lib/utils";
import { ChevronLeft, FileText, Pin } from "lucide-react";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const post = await getPost(id, user.id);

  if (!post) {
    notFound();
  }

  const isAdmin = post.author.role === "ADMIN" || post.author.role === "SUPERADMIN";
  const canManagePin = user.role === "ADMIN" || user.role === "SUPERADMIN";

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-3xl mx-auto">
      {/* Back link */}
      <Link 
        href={`/community/${post.space.slug}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to {post.space.name}
      </Link>

      {/* Post */}
      <Card className={post.isPinned ? "border-primary/30 bg-primary/5" : ""}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={post.author.avatarUrl || undefined} />
                <AvatarFallback>
                  {getInitials(post.author.firstName, post.author.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-lg">
                    {post.author.firstName} {post.author.lastName}
                  </span>
                  {isAdmin && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Simply
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <time title={formatDateTime(post.createdAt)}>
                    {formatRelativeTime(post.createdAt)}
                  </time>
                  <span>•</span>
                  <Link 
                    href={`/community/${post.space.slug}`}
                    className="hover:text-primary"
                  >
                    {post.space.name}
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {canManagePin ? <PostCommentsControl postId={post.id} closed={post.commentsClosed} /> : null}
              {post.isPinned && (
                <Pin className="h-4 w-4 text-primary" />
              )}
              {canManagePin ? (
                <PinToggleButton postId={post.id} initialPinned={post.isPinned} />
              ) : null}
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            {post.title ? (
              <h1 className="mb-4 text-2xl font-semibold leading-tight text-slate-950">
                {post.title}
              </h1>
            ) : null}
            <p className="whitespace-pre-wrap text-lg leading-relaxed">
              {post.content}
            </p>
          </div>

          {/* Attachments */}
          {post.attachments.length > 0 && (
            <div className="mb-6 space-y-3">
              {post.attachments.map((attachment) => (
                <div key={attachment.id}>
                  {attachment.type === "image" && (
                    <img
                      src={attachment.url}
                      alt=""
                      className="rounded-lg max-w-full"
                    />
                  )}
                  {attachment.type === "video" && (
                    <div className="overflow-hidden rounded-2xl border bg-black">
                      <video controls src={attachment.url} className="max-h-[36rem] w-full" />
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
                      className="inline-flex items-center gap-3 rounded-2xl border bg-muted/20 px-4 py-3 text-sm font-medium hover:border-primary/30 hover:text-primary"
                    >
                      <FileText className="h-4 w-4" />
                      Open bijlage
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {post.poll && post.pollQuestion ? (
            <div className="mb-6">
              <PostPoll
                postId={post.id}
                question={post.pollQuestion}
                options={post.poll.options}
                totalVotes={post.poll.totalVotes}
                userVote={post.poll.userVote}
              />
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <PostLikeButton
              postId={post.id}
              initialLiked={post.isLiked}
              initialCount={post._count.likes}
            />
            <span className="text-sm text-muted-foreground">
              {post._count.comments} {post._count.comments === 1 ? "comment" : "comments"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <div className="mt-6">
        <CommentSection 
          postId={post.id}
          comments={post.comments}
          currentUser={user}
          canComment={!post.commentsClosed}
        />
      </div>
    </div>
  );
}
