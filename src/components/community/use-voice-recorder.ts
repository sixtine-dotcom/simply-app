"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseVoiceRecorderOptions {
  onRecorded: (file: File) => Promise<void> | void;
}

export function useVoiceRecorder({ onRecorded }: UseVoiceRecorderOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isSupported = useMemo(() => {
    return typeof window !== "undefined" && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
  }, []);

  const cleanup = useCallback(() => {
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startRecording = useCallback(async () => {
    if (!isSupported || isRecording || isProcessing) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    streamRef.current = stream;
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const type = recorder.mimeType || "audio/webm";
      const extension = type.includes("mp4") ? "m4a" : "webm";
      const blob = new Blob(chunksRef.current, { type });
      setIsProcessing(true);

      try {
        await onRecorded(new File([blob], `voice-message-${Date.now()}.${extension}`, { type }));
      } finally {
        setIsProcessing(false);
        cleanup();
      }
    };

    recorder.start();
    setIsRecording(true);
  }, [cleanup, isProcessing, isRecording, isSupported, onRecorded]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    mediaRecorderRef.current.stop();
  }, []);

  return {
    isSupported,
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
  };
}
