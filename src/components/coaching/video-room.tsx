"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface VideoRoomProps {
  sessionId: string;
  roomUrl: string;
  token: string;
  userName: string;
}

export function VideoRoom({ sessionId, roomUrl, token, userName }: VideoRoomProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const callFrameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import Daily.co
    const initDaily = async () => {
      try {
        // @ts-ignore - Daily.co types
        const DailyIframe = (await import("@daily-co/daily-js")).DailyIframe;

        if (!containerRef.current) return;

        const callFrame = DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: true,
          iframeStyle: {
            position: "absolute",
            width: "100%",
            height: "100%",
            border: "0",
            borderRadius: "8px",
          },
        });

        callFrameRef.current = callFrame;

        // Set event handlers
        callFrame.on("joined-meeting", () => {
          setIsConnected(true);
          setIsLoading(false);
        });

        callFrame.on("left-meeting", () => {
          setIsConnected(false);
        });

        callFrame.on("error", (error: any) => {
          console.error("Daily.co error:", error);
          toast({
            title: "Fout",
            description: "Er ging iets mis met de video verbinding.",
            variant: "destructive",
          });
          setIsLoading(false);
        });

        // Join the call
        await callFrame.join({
          url: roomUrl,
          token,
          userName,
        });
      } catch (error) {
        console.error("Failed to initialize Daily.co:", error);
        toast({
          title: "Fout",
          description: "Kon video room niet laden. Controleer je verbinding.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    initDaily();

    // Cleanup
    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy().catch(console.error);
      }
    };
  }, [roomUrl, token, userName, toast]);

  const handleLeave = async () => {
    if (callFrameRef.current) {
      await callFrameRef.current.leave();
      window.location.href = `/coaching/${sessionId}`;
    }
  };

  const toggleVideo = async () => {
    if (callFrameRef.current) {
      await callFrameRef.current.setLocalVideo(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleAudio = async () => {
    if (callFrameRef.current) {
      await callFrameRef.current.setLocalAudio(!isAudioOn);
      setIsAudioOn(!isAudioOn);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Video Container */}
      <div className="flex-1 relative" ref={containerRef}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
              <p className="text-white">Verbinden met video room...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-center gap-4">
        <Button
          variant={isVideoOn ? "default" : "destructive"}
          size="icon"
          onClick={toggleVideo}
        >
          {isVideoOn ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant={isAudioOn ? "default" : "destructive"}
          size="icon"
          onClick={toggleAudio}
        >
          {isAudioOn ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>

        <Button variant="destructive" onClick={handleLeave}>
          <PhoneOff className="h-5 w-5 mr-2" />
          Verlaten
        </Button>
      </div>
    </div>
  );
}
