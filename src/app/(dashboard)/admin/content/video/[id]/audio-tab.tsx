"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Music, Pause, Play, Plus, Trash2, Upload, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StyleAudio } from "@/components/video-studio/SimplyVideo";

type LibraryAudio = { id: string; name: string; kind: "music" | "sfx"; src: string; durationSec: number | null };

export const DEFAULT_AUDIO: Required<Pick<StyleAudio, "voiceVolume" | "sfx">> & { music: StyleAudio["music"] } = {
  music: null,
  voiceVolume: 1,
  sfx: [],
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** One shared preview player: play/stop a library sound without touching the video. */
function usePreview() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => ref.current?.pause(), []);
  function toggle(src: string) {
    if (!ref.current) ref.current = new Audio();
    const audio = ref.current;
    if (playing === src) {
      audio.pause();
      setPlaying(null);
      return;
    }
    audio.src = src;
    audio.onended = () => setPlaying(null);
    void audio.play();
    setPlaying(src);
  }
  return { playing, toggle };
}

/** Sound like in CapCut: background music (quieter while speaking), sound effects and the voice level. */
export function AudioTab({
  audio,
  currentTime,
  saveState,
  onChange,
}: {
  audio: StyleAudio;
  currentTime: number;
  saveState: "idle" | "saving" | "saved" | "error";
  onChange: (next: StyleAudio) => void;
}) {
  const [library, setLibrary] = useState<LibraryAudio[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState<"music" | "sfx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = usePreview();
  const musicFile = useRef<HTMLInputElement>(null);
  const sfxFile = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/video/audio", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLibrary(d.audio ?? []))
      .catch(() => setLibrary([]));
  }, []);

  const music = (library ?? []).filter((a) => a.kind === "music");
  const sfx = (library ?? []).filter((a) => a.kind === "sfx");
  const voice = audio.voiceVolume ?? 1;
  const effects = audio.sfx ?? [];

  async function upload(file: File, kind: "music" | "sfx") {
    setUploading(kind);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUploading(null);
      return setError(data.error || "Upload mislukt");
    }
    const saved = await fetch("/api/admin/video/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name.replace(/\.[^.]+$/, ""), kind, src: data.url }),
    }).then((r) => r.json());
    setUploading(null);
    if (saved.audio) setLibrary((list) => [...(list ?? []), saved.audio]);
  }

  const slider = (value: number, max: number, onValue: (v: number) => void, label: string) => (
    <label className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <input type="range" min={0} max={max} step={0.01} value={value} onChange={(e) => onValue(Number(e.target.value))} className="flex-1" />
      <span className="w-10 text-right font-mono">{Math.round(value * 100)}%</span>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center">
        <p className="text-xs text-muted-foreground">Gratis muziek en geluidjes (Mixkit) + je eigen uploads.</p>
        <span className="ml-auto text-xs text-muted-foreground">
          {saveState === "saving" ? "Opslaan…" : saveState === "saved" ? "Opgeslagen ✓" : saveState === "error" ? "Opslaan mislukt" : ""}
        </span>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {/* Voice */}
      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Volume2 className="h-4 w-4" /> Je stem
        </h3>
        {slider(voice, 2, (v) => onChange({ ...audio, voiceVolume: v }), "Volume")}
      </section>

      {/* Music */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Music className="h-4 w-4" /> Achtergrondmuziek
          </h3>
          <Button type="button" size="sm" variant="ghost" className="ml-auto" disabled={uploading !== null} onClick={() => musicFile.current?.click()}>
            {uploading === "music" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />} Eigen muziek
          </Button>
          <input ref={musicFile} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "music"); e.target.value = ""; }} />
        </div>
        {audio.music ? (
          <div className="space-y-2">
            <p className="truncate text-sm">♪ {audio.music.label}</p>
            {slider(audio.music.volume, 1, (v) => onChange({ ...audio, music: { ...audio.music!, volume: v } }), "Volume")}
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={audio.music.duck} onChange={(e) => onChange({ ...audio, music: { ...audio.music!, duck: e.target.checked } })} />
              Zachter als ik praat
            </label>
            <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => onChange({ ...audio, music: null })}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Geen muziek
            </Button>
          </div>
        ) : null}
        <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">
          {library === null ? (
            <li className="p-2 text-xs text-muted-foreground">Laden…</li>
          ) : (
            music.map((m) => (
              <li key={m.id} className={cn("flex items-center gap-2 px-2 py-1.5 text-xs", audio.music?.src === m.src && "bg-slate-100")}>
                <button type="button" onClick={() => preview.toggle(m.src)} className="rounded-full p-1 hover:bg-slate-200" aria-label={`Beluister ${m.name}`}>
                  {preview.playing === m.src ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                {m.durationSec ? <span className="font-mono text-muted-foreground">{formatTime(m.durationSec)}</span> : null}
                <button
                  type="button"
                  onClick={() => onChange({ ...audio, music: { src: m.src, label: m.name, volume: audio.music?.volume ?? 0.15, duck: audio.music?.duck ?? true } })}
                  className="rounded-full border border-slate-200 px-2 py-0.5 hover:bg-slate-900 hover:text-white"
                >
                  {audio.music?.src === m.src ? "Gekozen" : "Kies"}
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Sound effects */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Geluidseffecten</h3>
          <Button type="button" size="sm" className="ml-auto" onClick={() => setAdding((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Geluid op {formatTime(currentTime)}
          </Button>
        </div>
        {adding ? (
          <div className="space-y-2 rounded-xl border border-slate-900 p-2">
            <div className="flex items-center">
              <p className="text-xs text-muted-foreground">Kies een geluid (▶ om te beluisteren):</p>
              <Button type="button" size="sm" variant="ghost" className="ml-auto" disabled={uploading !== null} onClick={() => sfxFile.current?.click()}>
                {uploading === "sfx" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />} Eigen geluid
              </Button>
              <input ref={sfxFile} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "sfx"); e.target.value = ""; }} />
            </div>
            <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
              {sfx.map((s) => (
                <li key={s.id} className="flex items-center gap-2 px-1 py-1 text-xs">
                  <button type="button" onClick={() => preview.toggle(s.src)} className="rounded-full p-1 hover:bg-slate-200" aria-label={`Beluister ${s.name}`}>
                    {preview.playing === s.src ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...audio, sfx: [...effects, { id: `sfx-${Date.now().toString(36)}`, src: s.src, label: s.name, at: Math.round(currentTime * 10) / 10, volume: 0.8 }] });
                      setAdding(false);
                    }}
                    className="rounded-full border border-slate-200 px-2 py-0.5 hover:bg-slate-900 hover:text-white"
                  >
                    Plaats
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {effects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nog geen geluidjes. Speel de video tot het juiste moment en klik op “Geluid op …”.</p>
        ) : (
          <ul className="space-y-2">
            {[...effects].sort((a, b) => a.at - b.at).map((fx) => (
              <li key={fx.id} className="space-y-1 rounded-xl border border-slate-100 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{formatTime(fx.at)}</span>
                  <span className="min-w-0 flex-1 truncate">{fx.label}</span>
                  <button type="button" onClick={() => onChange({ ...audio, sfx: effects.map((e) => (e.id === fx.id ? { ...e, at: Math.round(currentTime * 10) / 10 } : e)) })} className="rounded-full border border-slate-200 px-2 py-0.5 hover:bg-slate-100" title="Verplaats naar de huidige tijd">
                    naar {formatTime(currentTime)}
                  </button>
                  <button type="button" onClick={() => onChange({ ...audio, sfx: effects.filter((e) => e.id !== fx.id) })} className="text-red-600" aria-label="Verwijderen">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {slider(fx.volume, 1.5, (v) => onChange({ ...audio, sfx: effects.map((e) => (e.id === fx.id ? { ...e, volume: v } : e)) }), "Volume")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
