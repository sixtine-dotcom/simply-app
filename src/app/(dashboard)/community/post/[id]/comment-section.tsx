"use client";

import { ChangeEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { FileAudio2, FileText, Image as ImageIcon, Loader2, Mic, Paperclip, Send, Smile, Square, X } from "lucide-react";
import { COMMENTS_CLOSED_MESSAGE } from "@/lib/community-comment-policy";
import { CommentsClosedNotice } from "@/components/community/post-comments-control";
import { useVoiceRecorder } from "@/components/community/use-voice-recorder";

interface CommentAttachment {
  id: string;
  url: string;
  type: string;
  duration: number | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  attachments: CommentAttachment[];
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
    role?: string;
  };
  canComment: boolean;
}

interface ComposerAttachment {
  id: string;
  url: string;
  type: "image" | "voice_memo" | "file";
  label: string;
}

const EMOJI_OPTIONS = ["🙂", "😍", "👏", "🔥", "🎉", "❤️", "🌿", "💪", "✨", "🙌"];

export function CommentSection({
  postId,
  comments: initialComments,
  currentUser,
  canComment,
}: CommentSectionProps) {
  const [commentsClosed, setCommentsClosed] = useState(!canComment);
  useEffect(() => { setCommentsClosed(!canComment); }, [canComment]);
  const router = useRouter();
  const { toast } = useToast();
  const imageInputId = useId();
  const fileInputId = useId();
  const voiceInputId = useId();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const canRecordVoice = ["ADMIN", "SUPERADMIN", "COACH"].includes(currentUser.role || "");
  const voiceRecorder = useVoiceRecorder({
    onRecorded: async (file) => {
      setIsUploading(true);
      try {
        await uploadFile(file);
        toast({
          title: "Voice message added",
          description: "Your recording is attached to this reply.",
        });
      } catch (error) {
        toast({
          title: "Recording failed",
          description: error instanceof Error ? error.message : "Could not attach the recording.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
  });

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Upload failed");
    }

    if (!["image", "voice_memo", "file"].includes(result.type)) {
      throw new Error("This attachment type is not available in comments.");
    }

    setAttachments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        url: result.url,
        type: result.type,
        label: file.name,
      },
    ]);
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        await uploadFile(file);
      }

      toast({
        title: "Upload complete",
        description: files.length === 1 ? "Attachment added to your reply." : "Attachments added to your reply.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload the attachment.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commentsClosed || (!newComment.trim() && attachments.length === 0) || isSubmitting || isUploading) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim() || "Attachment reply",
          attachments: attachments.map(({ url, type }) => ({ url, type })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        if (payload.error === COMMENTS_CLOSED_MESSAGE) { setCommentsClosed(true); router.refresh(); }
        throw new Error(payload.error || "Could not publish your reply.");
      }

      setComments((current) => [...current, payload]);
      setNewComment("");
      setAttachments([]);
      setShowEmojiPicker(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not publish your reply.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewComment((current) => `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${emoji} `);
    setShowEmojiPicker(false);
  };

  return (
    <div>
      <h2 className="mb-4 font-display text-lg tracking-wider">
        COMMENTS ({comments.length})
      </h2>

      {commentsClosed ? <CommentsClosedNotice /> : null}
      {!commentsClosed ? (
        <Card className="mb-6">
          <CardContent className="p-4">
            <input
              id={imageInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => void handleFileSelection(event)}
            />
            <input
              id={fileInputId}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(event) => void handleFileSelection(event)}
            />
            <input
              id={voiceInputId}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/ogg,audio/webm,audio/x-m4a"
              className="sr-only"
              onChange={(event) => void handleFileSelection(event)}
            />

            <form onSubmit={handleSubmit}>
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser.avatarUrl || undefined} />
                  <AvatarFallback className="bg-[#5b5fc7] text-xs font-semibold uppercase text-white">
                    {getInitials(currentUser.firstName, currentUser.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a reply..."
                    className="min-h-[100px] w-full resize-none rounded-2xl border bg-white p-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />

                  {attachments.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {attachment.type === "image" ? (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            ) : attachment.type === "voice_memo" ? (
                              <FileAudio2 className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="truncate">{attachment.label}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-7 w-7"
                            onClick={() =>
                              setAttachments((current) => current.filter((item) => item.id !== attachment.id))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {showEmojiPicker ? (
                    <div className="rounded-2xl border bg-muted/20 p-3">
                      <p className="mb-2 text-sm font-medium">Add emoji</p>
                      <div className="flex flex-wrap gap-2">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="rounded-xl border bg-white px-3 py-2 text-xl transition hover:border-primary/30 hover:bg-primary/5"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="ghost" size="sm" type="button" onClick={() => setShowEmojiPicker((current) => !current)}>
                        <Smile className="h-4 w-4" />
                        Emoji
                      </Button>
                      <Button variant="ghost" size="sm" type="button" asChild disabled={isUploading}>
                        <label htmlFor={imageInputId} className="cursor-pointer">
                          <ImageIcon className="h-4 w-4" />
                          Photo
                        </label>
                      </Button>
                      <Button variant="ghost" size="sm" type="button" asChild disabled={isUploading}>
                        <label htmlFor={fileInputId} className="cursor-pointer">
                          <Paperclip className="h-4 w-4" />
                          Attachment
                        </label>
                      </Button>
                      {canRecordVoice ? (
                        <>
                          <Button variant="ghost" size="sm" type="button" asChild disabled={isUploading || voiceRecorder.isRecording}>
                            <label htmlFor={voiceInputId} className="cursor-pointer">
                              <FileAudio2 className="h-4 w-4" />
                              Voice file
                            </label>
                          </Button>
                          {voiceRecorder.isSupported ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              disabled={isUploading || voiceRecorder.isProcessing}
                              onClick={() =>
                                voiceRecorder.isRecording
                                  ? voiceRecorder.stopRecording()
                                  : void voiceRecorder.startRecording()
                              }
                            >
                              {voiceRecorder.isRecording ? (
                                <>
                                  <Square className="h-4 w-4" />
                                  Stop recording
                                </>
                              ) : (
                                <>
                                  <Mic className="h-4 w-4" />
                                  Record voice
                                </>
                              )}
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    <Button type="submit" size="sm" disabled={(!newComment.trim() && attachments.length === 0) || isSubmitting || isUploading}>
                      {isSubmitting || isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="mr-1 h-4 w-4" />
                          Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map((comment) => <CommentCard key={comment.id} comment={comment} />)
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            No comments yet. {!commentsClosed ? "Be the first to reply." : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function CommentCard({ comment }: { comment: Comment }) {
  const isCoach =
    comment.author.role === "ADMIN" ||
    comment.author.role === "SUPERADMIN" ||
    comment.author.role === "COACH";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={comment.author.avatarUrl || undefined} />
            <AvatarFallback className="bg-[#5b5fc7] text-xs font-semibold uppercase text-white">
              {getInitials(comment.author.firstName, comment.author.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {comment.author.firstName} {comment.author.lastName}
              </span>
              {isCoach ? (
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  Coach
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{comment.content}</p>

            {comment.attachments.length > 0 ? (
              <div className="space-y-3">
                {comment.attachments.map((attachment) => (
                  <div key={attachment.id}>
                    {attachment.type === "image" ? (
                      <img src={attachment.url} alt="" className="max-h-80 rounded-2xl border" />
                    ) : attachment.type === "voice_memo" ? (
                      <audio controls src={attachment.url} className="w-full" />
                    ) : (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-3 rounded-2xl border bg-muted/20 px-4 py-3 text-sm font-medium hover:border-primary/30 hover:text-primary"
                      >
                        <FileText className="h-4 w-4" />
                        Open attachment
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
