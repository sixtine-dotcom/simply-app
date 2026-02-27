"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoRoom } from "./video-room";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface VideoRoomLoaderProps {
  sessionId: string;
  userName: string;
}

export function VideoRoomLoader({ sessionId, userName }: VideoRoomLoaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [roomData, setRoomData] = useState<{
    roomUrl: string;
    token: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/room`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Kon video room niet laden");
        }

        const data = await response.json();
        setRoomData({
          roomUrl: data.roomUrl,
          token: data.token,
        });
      } catch (error) {
        console.error("Failed to load room:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Kon video room niet laden"
        );
        toast({
          title: "Fout",
          description: "Kon video room niet laden. Controleer je verbinding.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
  }, [sessionId, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Video room laden...</p>
        </div>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
            <h2 className="font-display text-xl tracking-wider mb-2">
              FOUT
            </h2>
            <p className="text-muted-foreground mb-4">
              {error || "Kon video room niet laden"}
            </p>
            <Button onClick={() => router.push(`/coaching/${sessionId}`)}>
              Terug naar sessie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <VideoRoom
      sessionId={sessionId}
      roomUrl={roomData.roomUrl}
      token={roomData.token}
      userName={userName}
    />
  );
}
