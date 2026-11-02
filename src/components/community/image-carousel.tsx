"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: { id: string; url: string }[];
}

/** Swipeable image carousel with arrows and dots (one slide per image). */
export function ImageCarousel({ images }: ImageCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 1) {
    return (
      <img src={images[0].url} alt="" className="rounded-lg max-h-96 w-auto" />
    );
  }

  const goTo = (i: number, e?: React.MouseEvent) => {
    // The carousel sits inside a link to the post; don't navigate on arrow/dot clicks.
    e?.preventDefault();
    e?.stopPropagation();
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-lg bg-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <div key={image.id} className="w-full flex-none snap-center flex items-center justify-center">
            <img
              src={image.url}
              alt={`Slide ${i + 1} van ${images.length}`}
              className="max-h-[32rem] w-full object-contain"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      {index > 0 && (
        <button
          type="button"
          aria-label="Vorige"
          onClick={(e) => goTo(index - 1, e)}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {index < images.length - 1 && (
        <button
          type="button"
          aria-label="Volgende"
          onClick={(e) => goTo(index + 1, e)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
        {index + 1}/{images.length}
      </div>

      <div className="mt-2 flex justify-center gap-1.5">
        {images.map((image, i) => (
          <button
            key={image.id}
            type="button"
            aria-label={`Ga naar slide ${i + 1}`}
            onClick={(e) => goTo(i, e)}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              i === index ? "bg-primary" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}
