"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Check, Link as LinkIcon, Loader2, Mail, Video, X } from "lucide-react";

type CreatedInstantMeeting = {
  sessionId: string;
  roomHref: string;
};

export function InstantMeetingButton({ defaultTitle = "Vergadering" }: { defaultTitle?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [createdMeeting, setCreatedMeeting] = useState<CreatedInstantMeeting | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const createMeeting = async () => {
    if (createdMeeting) return createdMeeting;

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/sessions/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kon vergadering niet starten");
      const meeting = { sessionId: data.sessionId as string, roomHref: data.roomHref as string };
      setCreatedMeeting(meeting);
      return meeting;
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon vergadering niet starten",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const startMeeting = async () => {
    const meeting = await createMeeting();
    if (meeting) router.push(meeting.roomHref);
  };

  const getMeetingLink = async () => {
    const meeting = await createMeeting();
    if (!meeting) return;
    const url = `${window.location.origin}${meeting.roomHref}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsLinkCopied(true);
    } catch {
      setIsLinkCopied(false);
    }
  };

  const shareByEmail = () => {
    if (!createdMeeting) return;
    const url = `${window.location.origin}${createdMeeting.roomHref}`;
    const subject = encodeURIComponent(title.trim() || "Vergadering");
    const body = encodeURIComponent(`Je kan deelnemen via deze link:\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const closeDialog = () => {
    if (isLoading) return;
    setIsOpen(false);
    setTitle(defaultTitle);
    setCreatedMeeting(null);
    setIsLinkCopied(false);
  };

  const openDialog = () => {
    setTitle(defaultTitle);
    setCreatedMeeting(null);
    setIsLinkCopied(false);
    setIsOpen(true);
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={openDialog}>
        <Video className="mr-2 h-4 w-4" />
        Nu vergaderen
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[480px] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl">
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-semibold text-neutral-900">
                  {createdMeeting ? title.trim() || "Vergadering" : "Nu een vergadering starten"}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDialog}
                  disabled={isLoading}
                  aria-label="Sluiten"
                  className="-mr-2 -mt-2 h-9 w-9 text-neutral-600 hover:bg-neutral-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {isLoading ? (
                <div className="flex min-h-28 flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#12483b]" />
                  <p className="text-sm font-medium text-neutral-700">Laden ...</p>
                </div>
              ) : createdMeeting ? (
                <div className="mt-4 space-y-4">
                  <button
                    type="button"
                    className="text-sm text-[#12483b] underline-offset-2 hover:underline"
                  >
                    Opties voor vergaderingen configureren
                  </button>
                  <div className="relative">
                    <Input
                      readOnly
                      value={`${window.location.origin}${createdMeeting.roomHref}`}
                      className="h-9 rounded-sm border-0 bg-neutral-100 pr-10 text-sm text-neutral-700"
                    />
                    {isLinkCopied ? (
                      <span className="absolute -top-8 right-0 rounded bg-white px-3 py-1 text-xs text-neutral-600 shadow">
                        Gekopieerd naar klembord
                      </span>
                    ) : null}
                    <Check className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                    <Button className="h-10 bg-[#12483b] hover:bg-[#0f3d32]" onClick={startMeeting}>
                      <Video className="mr-2 h-4 w-4" />
                      Vergadering starten
                    </Button>
                    <Button variant="outline" className="h-10" onClick={shareByEmail}>
                      <Mail className="mr-2 h-4 w-4" />
                      Delen via e-mail
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <label className="block text-sm font-medium text-neutral-700" htmlFor="instant-meeting-title">
                    Naam van vergadering
                  </label>
                  <Input
                    id="instant-meeting-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") startMeeting();
                    }}
                    className="h-9 rounded-sm border-neutral-300 text-sm"
                    autoFocus
                  />
                  <div className="grid gap-2 sm:grid-cols-[1fr_1.45fr]">
                    <Button className="h-10 bg-[#12483b] hover:bg-[#0f3d32]" onClick={startMeeting}>
                      <Video className="mr-2 h-4 w-4" />
                      Vergadering starten
                    </Button>
                    <Button variant="outline" className="h-10" onClick={getMeetingLink}>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Een koppeling ophalen om te delen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
