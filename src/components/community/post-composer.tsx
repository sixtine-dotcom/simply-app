"use client";

import { ChangeEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, FileAudio2, FileText, Image, Loader2, Mic, Paperclip, Plus, Send, Smile, Square, Video, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useVoiceRecorder } from "@/components/community/use-voice-recorder";
import { getInitials } from "@/lib/utils";
import { MentionField } from "@/components/community/mention-field";

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
  const titleInputId = useId();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [spaceId, setSpaceId] = useState(defaultSpaceId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Uploaden mislukt");
    setAttachments((current) => [
      ...current,
      { id: crypto.randomUUID(), url: result.url, type: result.type, label: file.name },
    ]);
  };

  const voiceRecorder = useVoiceRecorder({
    onRecorded: async (file) => {
      setIsUploading(true);
      try {
        await uploadFile(file);
        toast({ title: "Spraakbericht toegevoegd", description: "Je opname is aan het bericht toegevoegd." });
      } catch (error) {
        toast({
          title: "Opname mislukt",
          description: error instanceof Error ? error.message : "De opname kon niet worden toegevoegd.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
  });

  const canSubmit =
    (content.trim().length > 0 || attachments.length > 0) &&
    Boolean(spaceId) &&
    !isSubmitting &&
    !isUploading &&
    (!pollEnabled || (pollQuestion.trim().length > 0 && pollOptions.filter((option) => option.trim()).length >= 2));

  const resetComposer = () => {
    setTitle("");
    setContent("");
    setAttachments([]);
    setPollEnabled(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowEmojiPicker(false);
    setMentionedUserIds([]);
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setIsUploading(true);
    try {
      for (const file of files) await uploadFile(file);
      toast({ title: "Bestand toegevoegd" });
    } catch (error) {
      toast({ title: "Uploaden mislukt", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
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
          content: content.trim() || "Spraakbericht",
          spaceId,
          mentions: mentionedUserIds,
          attachments: attachments.map(({ url, type }) => ({ url, type })),
          poll: pollEnabled
            ? { question: pollQuestion.trim(), options: pollOptions.map((option) => option.trim()).filter(Boolean) }
            : undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Het bericht kon niet worden geplaatst.");
      }
      resetComposer();
      toast({ title: "Bericht geplaatst" });
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast({ title: "Er ging iets mis", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="community-round-card overflow-visible !rounded-2xl border-black/10 bg-white !shadow-[0_8px_28px_-22px_rgba(17,28,20,0.35)]">
      <CardContent className="p-5 sm:p-6">
        <input id={imageInputId} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => void handleFileSelection(event)} />
        <input id={videoInputId} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" className="sr-only" onChange={(event) => void handleFileSelection(event)} />
        <input id={fileInputId} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => void handleFileSelection(event)} />
        <input id={voiceInputId} type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/webm,audio/x-m4a" className="sr-only" onChange={(event) => void handleFileSelection(event)} />

        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="!rounded-2xl border border-black/10 bg-[#f7f9f7] px-4 py-3 transition focus-within:border-[#173622]/40 focus-within:bg-white">
              <div className="flex items-baseline gap-2">
                <label htmlFor={titleInputId} className="text-sm font-semibold text-[#1b201c]">Titel</label>
                <span className="text-[11px] text-[#7a817c]">optioneel</span>
              </div>
              <input
                id={titleInputId}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Voeg een titel toe..."
                className="mt-1 w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[#9aa09b]"
              />
              <MentionField
                value={content}
                onChange={setContent}
                onMention={(userId) => setMentionedUserIds((current) => current.includes(userId) ? current : [...current, userId])}
                spaceId={spaceId}
                placeholder="Schrijf een bericht..."
                ariaLabel="Schrijf een bericht. Typ apenstaartje om iemand uit dit kanaal te taggen."
                multiline
                className="mt-2 min-h-[70px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 outline-none placeholder:text-[#9aa09b]"
              />
            </div>

            {attachments.length ? (
              <div className="mb-3 mt-3 grid gap-2 sm:grid-cols-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between rounded-xl border border-black/10 bg-[#fafaf8] px-3 py-2 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      {attachment.type === "image" ? <Image className="h-4 w-4" /> : attachment.type === "video" ? <Video className="h-4 w-4" /> : attachment.type === "voice_memo" ? <FileAudio2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      <span className="truncate">{attachment.label}</span>
                    </div>
                    <Button variant="ghost" size="icon" type="button" className="h-7 w-7" onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            {showEmojiPicker ? (
              <div className="mb-3 mt-3 flex flex-wrap gap-1.5 rounded-xl border border-black/10 bg-white p-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button key={emoji} type="button" className="rounded-md px-2 py-1 text-lg hover:bg-muted" onClick={() => { setContent((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}${emoji} `); setShowEmojiPicker(false); }}>
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}

            {pollEnabled ? (
              <div className="mb-3 mt-3 space-y-2 rounded-xl border border-black/10 bg-[#fafaf8] p-3">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold">Peiling</span><Button variant="ghost" size="sm" type="button" onClick={() => setPollEnabled(false)}>Verwijderen</Button></div>
                <input value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="Vraag van de peiling" className="h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#173622]/40" />
                {pollOptions.map((option, index) => (
                  <input key={index} value={option} onChange={(event) => setPollOptions((current) => current.map((entry, entryIndex) => entryIndex === index ? event.target.value : entry))} placeholder={`Optie ${index + 1}`} className="h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#173622]/40" />
                ))}
                {pollOptions.length < 6 ? <Button variant="outline" size="sm" type="button" onClick={() => setPollOptions((current) => [...current, ""])}>Optie toevoegen</Button> : null}
              </div>
            ) : null}

            <div className="mt-3 flex flex-col gap-3 border-t pt-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-1">
                <Button variant="ghost" size="icon" type="button" asChild disabled={isUploading} className="h-8 w-8 !rounded-full"><label htmlFor={fileInputId} className="cursor-pointer" title="Bestand toevoegen"><Plus className="h-4 w-4" /></label></Button>
                <Button variant="ghost" size="icon" type="button" asChild disabled={isUploading} className="h-8 w-8 !rounded-full"><label htmlFor={imageInputId} className="cursor-pointer" title="Foto toevoegen"><Image className="h-4 w-4" /></label></Button>
                <Button variant="ghost" size="icon" type="button" asChild disabled={isUploading} className="h-8 w-8 !rounded-full"><label htmlFor={videoInputId} className="cursor-pointer" title="Video toevoegen"><Video className="h-4 w-4" /></label></Button>
                <Button variant="ghost" size="icon" type="button" className="h-8 w-8 !rounded-full" title="Emoji toevoegen" onClick={() => setShowEmojiPicker((current) => !current)}><Smile className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" type="button" asChild disabled={isUploading || voiceRecorder.isRecording} className="h-8 w-8 !rounded-full"><label htmlFor={voiceInputId} className="cursor-pointer" title="Spraakbestand toevoegen"><FileAudio2 className="h-4 w-4" /></label></Button>
                {voiceRecorder.isSupported ? (
                  <Button variant="ghost" size="icon" type="button" className="h-8 w-8 !rounded-full" disabled={isUploading || voiceRecorder.isProcessing} title={voiceRecorder.isRecording ? "Opname stoppen" : "Spraakbericht opnemen"} onClick={() => voiceRecorder.isRecording ? voiceRecorder.stopRecording() : void voiceRecorder.startRecording()}>
                    {voiceRecorder.isRecording ? <Square className="h-4 w-4 fill-current text-red-600" /> : <Mic className="h-4 w-4" />}
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon" type="button" className="h-8 w-8 !rounded-full" title="Peiling toevoegen" disabled={pollEnabled} onClick={() => setPollEnabled(true)}><BarChart3 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" type="button" asChild disabled={isUploading} className="h-8 w-8 !rounded-full"><label htmlFor={fileInputId} className="cursor-pointer" title="Bijlage toevoegen"><Paperclip className="h-4 w-4" /></label></Button>
              </div>
              <div className="flex items-center justify-end gap-2">
                <select value={spaceId} onChange={(event) => { setSpaceId(event.target.value); setMentionedUserIds([]); }} aria-label="Kies een kanaal" className="h-9 max-w-[210px] community-round-pill !rounded-full border border-black/15 bg-white px-3 text-xs outline-none focus:border-[#173622]">
                  <option value="" disabled>Kies een kanaal</option>
                  {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
                </select>
                {(content || title || attachments.length || pollEnabled) ? <Button variant="ghost" size="sm" type="button" onClick={resetComposer}>Wissen</Button> : null}
                <Button size="sm" type="button" className="!rounded-full bg-[#173622] px-5 text-white hover:bg-[#21492e]" disabled={!canSubmit} onClick={handleSubmit}>
                  {isSubmitting || isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1 h-4 w-4" />Plaatsen</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
