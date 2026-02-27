"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  url: string;
  provider: string | null;
  onProgress?: (seconds: number) => void;
  initialProgress?: number;
}

export function VideoPlayer({ url, provider, onProgress, initialProgress = 0 }: VideoPlayerProps) {
  // Handle Loom embeds
  if (provider === "loom" || url.includes("loom.com")) {
    return <LoomEmbed url={url} />;
  }

  // Handle YouTube embeds
  if (provider === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
    return <YouTubeEmbed url={url} />;
  }

  // Handle Vimeo embeds
  if (provider === "vimeo" || url.includes("vimeo.com")) {
    return <VimeoEmbed url={url} />;
  }

  // Handle direct video URLs (MP4, etc.) or Mux
  return (
    <NativeVideoPlayer 
      url={url} 
      onProgress={onProgress}
      initialProgress={initialProgress}
    />
  );
}

function LoomEmbed({ url }: { url: string }) {
  // Extract Loom ID from various URL formats
  // https://www.loom.com/share/abc123
  // https://www.loom.com/embed/abc123
  const loomIdMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  const loomId = loomIdMatch ? loomIdMatch[1] : null;

  if (!loomId) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Ongeldige Loom URL</p>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={`https://www.loom.com/embed/${loomId}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`}
        frameBorder="0"
        allowFullScreen
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

function YouTubeEmbed({ url }: { url: string }) {
  // Extract YouTube ID
  let videoId = null;
  
  if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0];
  } else if (url.includes("youtube.com/watch")) {
    const urlParams = new URLSearchParams(url.split("?")[1]);
    videoId = urlParams.get("v");
  } else if (url.includes("youtube.com/embed/")) {
    videoId = url.split("youtube.com/embed/")[1]?.split("?")[0];
  }

  if (!videoId) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Ongeldige YouTube URL</p>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
        frameBorder="0"
        allowFullScreen
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

function VimeoEmbed({ url }: { url: string }) {
  // Extract Vimeo ID
  const vimeoIdMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const vimeoId = vimeoIdMatch ? vimeoIdMatch[1] : null;

  if (!vimeoId) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Ongeldige Vimeo URL</p>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`}
        frameBorder="0"
        allowFullScreen
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
      />
    </div>
  );
}

interface NativeVideoPlayerProps {
  url: string;
  onProgress?: (seconds: number) => void;
  initialProgress?: number;
}

function NativeVideoPlayer({ url, onProgress, initialProgress }: NativeVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      const ip = initialProgress ?? 0;
      if (ip > 0 && ip < video.duration - 10) {
        video.currentTime = ip;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Report progress every 10 seconds
      if (onProgress && Math.floor(video.currentTime) % 10 === 0) {
        onProgress(Math.floor(video.currentTime));
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [initialProgress, onProgress]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * duration;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video rounded-lg overflow-hidden bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full"
        onClick={togglePlay}
        playsInline
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      {/* Play button overlay (when paused) */}
      {!isPlaying && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-8 w-8 text-primary ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity",
        showControls || !isPlaying ? "opacity-100" : "opacity-0"
      )}>
        {/* Progress bar */}
        <div 
          className="h-1 bg-white/30 rounded-full mb-4 cursor-pointer"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-white rounded-full relative"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-white/80">
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </button>

            <button onClick={toggleMute} className="text-white hover:text-white/80">
              {isMuted ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </button>

            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button onClick={toggleFullscreen} className="text-white hover:text-white/80">
            <Maximize className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
