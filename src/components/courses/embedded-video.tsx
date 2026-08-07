"use client";

type EmbeddedVideoProps = {
  embedCode: string;
};

export function EmbeddedVideo({ embedCode }: EmbeddedVideoProps) {
  const sanitized = embedCode
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");

  return (
    <div
      className="aspect-video overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
