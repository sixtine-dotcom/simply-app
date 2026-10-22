"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

type MentionMember = { id: string; firstName: string; lastName: string; avatarUrl: string | null; role: string };

export function MentionField({
  value,
  onChange,
  onMention,
  spaceId,
  placeholder,
  multiline = false,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onMention: (userId: string) => void;
  spaceId: string;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [members, setMembers] = useState<MentionMember[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (query === null || !spaceId) {
      setMembers([]);
      return;
    }
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/community/spaces/${spaceId}/members?q=${encodeURIComponent(query)}`);
      if (!response.ok || id !== requestId.current) return;
      const data = await response.json();
      if (id === requestId.current) setMembers(Array.isArray(data) ? data : []);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [query, spaceId]);

  const updateValue = (nextValue: string, cursor: number) => {
    onChange(nextValue);
    const beforeCursor = nextValue.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([^@\n]*)$/);
    setQuery(match ? match[1] : null);
  };

  const selectMember = (member: MentionMember) => {
    const match = value.match(/(?:^|\s)@([^@\n]*)$/);
    if (!match || match.index === undefined) return;
    const prefixLength = match.index + (match[0].startsWith(" ") ? 1 : 0);
    onChange(`${value.slice(0, prefixLength)}@${member.firstName} ${member.lastName} `);
    onMention(member.id);
    setQuery(null);
    setMembers([]);
  };

  const shared = {
    value,
    placeholder,
    "aria-label": ariaLabel || placeholder,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateValue(event.target.value, event.target.selectionStart || event.target.value.length),
    onKeyUp: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => updateValue(event.currentTarget.value, event.currentTarget.selectionStart || event.currentTarget.value.length),
    className,
  };

  return (
    <div className="relative min-w-0 flex-1">
      {multiline ? <textarea {...shared} rows={2} /> : <input {...shared} />}
      {query !== null && members.length > 0 ? (
        <div className="absolute left-0 top-full z-40 mt-1 max-h-64 w-full min-w-[260px] overflow-y-auto rounded-xl border border-black/10 bg-white p-1.5 shadow-[0_18px_45px_-28px_rgba(17,28,20,0.55)]">
          {members.map((member) => (
            <button key={member.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectMember(member)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f2f5f1]">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatarUrl || undefined} />
                <AvatarFallback className="bg-[#edf1ec] text-[10px] font-semibold text-[#173622]">{getInitials(member.firstName, member.lastName)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#202722]">{member.firstName} {member.lastName}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
