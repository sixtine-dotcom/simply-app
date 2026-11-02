"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { getInitials } from "@/lib/utils";
import { Image, Loader2, Send, X } from "lucide-react";
import { uploadFile } from "@/lib/upload-client";

const MAX_IMAGES = 10;

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
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;

    const room = MAX_IMAGES - images.length;
    if (files.length > room) {
      toast({
        title: "Te veel foto's",
        description: `Je kunt maximaal ${MAX_IMAGES} foto's per post toevoegen.`,
        variant: "destructive",
      });
    }

    setIsFocused(true);
    setIsUploading(true);
    const failed: string[] = [];
    // Upload one by one so the slides keep the order they were selected in.
    for (const file of files.slice(0, Math.max(0, room))) {
      try {
        const uploaded = await uploadFile(file);
        setImages((prev) => [...prev, uploaded]);
      } catch (error) {
        failed.push(error instanceof Error ? error.message : file.name);
      }
    }
    setIsUploading(false);

    if (failed.length > 0) {
      toast({
        title: "Upload mislukt",
        description: failed.join(" · "),
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setContent("");
    setImages([]);
    setIsFocused(false);
  };

  const canSubmit = (content.trim().length > 0 || images.length > 0) && !isUploading;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          spaceId,
          attachments: images.map((img) => ({ url: img.url, type: "image" })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kon post niet plaatsen");
      }

      reset();

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

            {images.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <div key={img.url} className="relative flex-none">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      aria-label="Foto verwijderen"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {isUploading && (
                  <div className="flex h-20 w-20 flex-none items-center justify-center rounded-lg border bg-muted">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}

            {(isFocused || content || images.length > 0) && (
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

                  {/* Image upload: one or more photos (shown as a carousel) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    title="Foto's toevoegen"
                    disabled={isUploading || images.length >= MAX_IMAGES}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Image className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {(content || images.length > 0) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={reset}
                    >
                      Annuleren
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
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
