"use client";

import { useState, useRef } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface MediaPlayerProps {
  type: "audio" | "video";
  src: string;
  poster?: string;
  className?: string;
}

export function MediaPlayer({ type, src, poster, className = "" }: MediaPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  function togglePlay() {
    const el = mediaRef.current;
    if (!el) return;
    if (playing) { el.pause(); } else { el.play(); }
    setPlaying(!playing);
  }

  function toggleMute() {
    const el = mediaRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(!muted);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (type === "video") {
    return (
      <div className={`relative rounded-xl overflow-hidden bg-black ${className}`}>
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={src}
          poster={poster}
          className="w-full max-h-64 object-contain"
          onTimeUpdate={() => {
            const el = mediaRef.current as HTMLVideoElement;
            if (el) { setCurrentTime(el.currentTime); setProgress((el.currentTime / (el.duration || 1)) * 100); }
          }}
          onLoadedMetadata={() => {
            const el = mediaRef.current as HTMLVideoElement;
            if (el) setDuration(el.duration);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          playsInline
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} className="text-white p-1">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <div className="flex-1 h-1 rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-white/70">{formatTime(currentTime)}/{formatTime(duration)}</span>
            <button onClick={toggleMute} className="text-white p-1">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl border border-app-border bg-app-card p-2.5 ${className}`}>
      <button
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-primary text-white hover:opacity-90 transition-opacity"
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] text-app-text-muted">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-app-border mt-1">
          <div className="h-full rounded-full bg-app-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <button onClick={toggleMute} className="p-1 text-app-text-muted hover:text-app-text">
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <audio
        ref={mediaRef as React.RefObject<HTMLAudioElement>}
        src={src}
        onTimeUpdate={() => {
          const el = mediaRef.current as HTMLAudioElement;
          if (el) { setCurrentTime(el.currentTime); setProgress((el.currentTime / (el.duration || 1)) * 100); }
        }}
        onLoadedMetadata={() => {
          const el = mediaRef.current as HTMLAudioElement;
          if (el) setDuration(el.duration);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}
