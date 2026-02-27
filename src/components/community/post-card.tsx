"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { Heart, MessageCircle, MoreHorizontal, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: {
    id: string;
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
    _count: {
      comments: number;
      likes: number;
    };
    isLiked: boolean;
  };
  currentUserId: string;
  showSpace?: boolean;
}

export function PostCard({ post, currentUserId, showSpace = true }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [isLiking, setIsLiking] = useState(false);

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

  const isAdmin = post.author.role === "ADMIN";

  return (
    <Card className={post.isPinned ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.author.avatarUrl || undefined} />
              <AvatarFallback>
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

          <div className="flex items-center gap-1">
            {post.isPinned && (
              <Pin className="h-4 w-4 text-primary" />
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <Link href={`/community/post/${post.id}`}>
          <div className="mb-4">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Attachments */}
          {post.attachments.length > 0 && (
            <div className="mb-4 grid gap-2">
              {post.attachments.map((attachment) => (
                <div key={attachment.id}>
                  {attachment.type === "image" && (
                    <img
                      src={attachment.url}
                      alt=""
                      className="rounded-lg max-h-96 w-auto"
                    />
                  )}
                  {attachment.type === "voice_memo" && (
                    <audio controls src={attachment.url} className="w-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Link>

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
        </div>
      </CardContent>
    </Card>
  );
}
