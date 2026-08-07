"use client";

import { ChangeEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { getInitials } from "@/lib/utils";
import { BarChart3, Mic, Square, FileAudio2, FileText, Image, Loader2, Paperclip, Send, Smile, Video, X } from "lucide-react";
import { useVoiceRecorder } from "@/components/community/use-voice-recorder";

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
    role?: string;
  };
  onSuccess?: () => void;
}

interface ComposerAttachment {
  id: string;
  url: string;
  type: "image" | "video" | "voice_memo" | "file";
  label: string;
}

const EMOJI_OPTIONS = ["🙂", "😍", "👏", "🔥", "🎉", "❤️", "🌿", "💪", "✨", "🙌", "💬", "🚀"];

export function PostComposer({ spaces, defaultSpaceId, user, onSuccess }: PostComposerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const imageInputId = useId();
  const videoInputId = useId();
  const fileInputId = useId();
  const voiceInputId = useId();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [spaceId, setSpaceId] = useState(defaultSpaceId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const canRecordVoice = ["ADMIN", "SUPERADMIN", "COACH"].includes(user.role || "");
  const voiceRecorder = useVoiceRecorder({
    onRecorded: async (file) => {
      setIsFocused(true);
      setIsUploading(true);
      try {
        await uploadFile(file);
        toast({
          title: "Voice message added",
          description: "Your recording is attached to this post.",
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

  const canSubmit =
    content.trim().length > 0 &&
    !isSubmitting &&
    !isUploading &&
    (!pollEnabled ||
      (pollQuestion.trim().length > 0 &&
        pollOptions.filter((option) => option.trim().length > 0).length >= 2));

  const resetComposer = () => {
    setTitle("");
    setContent("");
    setIsFocused(false);
    setAttachments([]);
    setPollEnabled(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowEmojiPicker(false);
  };

  const insertEmoji = (emoji: string) => {
    setContent((current) => `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${emoji} `);
    setIsFocused(true);
    setShowEmojiPicker(false);
  };

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

    setIsFocused(true);
    setIsUploading(true);

    try {
      for (const file of files) {
        await uploadFile(file);
      }
      toast({
        title: "Upload complete",
        description: files.length === 1 ? "Attachment added to your post." : "Attachments added to your post.",
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

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim(),
          spaceId,
          attachments: attachments.map(({ url, type }) => ({ url, type })),
          poll: pollEnabled
            ? {
                question: pollQuestion.trim(),
                options: pollOptions.map((option) => option.trim()).filter(Boolean),
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not publish your post.");
      }

      resetComposer();

      toast({
        title: "Published",
        description: "Your post was shared with the community.",
      });

      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not publish your post.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <input
          id={imageInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => void handleFileSelection(event)}
        />
        <input
          id={videoInputId}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
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
              placeholder="Share something with the community..."
              className="w-full resize-none border-0 bg-transparent p-0 focus:ring-0 focus:outline-none min-h-[60px] placeholder:text-muted-foreground"
              rows={isFocused ? 3 : 1}
            />

            {(isFocused || content) && (
              <div className="mt-3 space-y-4 border-t pt-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optional post title"
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary"
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
                            <Image className="h-4 w-4 text-muted-foreground" />
                          ) : attachment.type === "video" ? (
                            <Video className="h-4 w-4 text-muted-foreground" />
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
                            setAttachments((current) =>
                              current.filter((item) => item.id !== attachment.id)
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {pollEnabled ? (
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium">Add poll</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setPollEnabled(false);
                          setPollQuestion("");
                          setPollOptions(["", ""]);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <input
                        value={pollQuestion}
                        onChange={(event) => setPollQuestion(event.target.value)}
                        placeholder="Poll question"
                        className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
                      />
                      <div className="space-y-2">
                        {pollOptions.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              value={option}
                              onChange={(event) =>
                                setPollOptions((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index ? event.target.value : entry
                                  )
                                )
                              }
                              placeholder={`Option ${index + 1}`}
                              className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
                            />
                            {pollOptions.length > 2 ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="h-9 w-9"
                                onClick={() =>
                                  setPollOptions((current) =>
                                    current.filter((_, entryIndex) => entryIndex !== index)
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {pollOptions.length < 6 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setPollOptions((current) => [...current, ""])}
                        >
                          Add option
                        </Button>
                      ) : null}
                    </div>
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

                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setShowEmojiPicker((current) => !current)}
                  >
                    <Smile className="h-4 w-4" />
                    Emoji
                  </Button>
                  <Button variant="ghost" size="sm" type="button" asChild disabled={isUploading}>
                    <label htmlFor={imageInputId} className="cursor-pointer">
                      <Image className="h-4 w-4" />
                      Photo
                    </label>
                  </Button>
                  <Button variant="ghost" size="sm" type="button" asChild disabled={isUploading}>
                    <label htmlFor={videoInputId} className="cursor-pointer">
                      <Video className="h-4 w-4" />
                      Video
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
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setPollEnabled(true)}
                    disabled={pollEnabled}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Poll
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {(content || attachments.length > 0 || pollEnabled) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetComposer}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                  >
                    {isSubmitting || isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Publish
                      </>
                    )}
                  </Button>
                </div>
              </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
