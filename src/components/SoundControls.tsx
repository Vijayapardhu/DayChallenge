"use client";

import { Volume1, Volume2, VolumeX } from "lucide-react";
import { getSound } from "@/lib/sound";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SoundControls({ className }: { className?: string }) {
  const { sound, setSound } = useApp();

  const status = sound.muted ? "muted" : sound.volume > 0.5 ? "high" : "low";
  const Icon = status === "muted" ? VolumeX : status === "high" ? Volume2 : Volume1;

  return (
    <div className={cn("sound-controls", className)}>
      <button
        type="button"
        className="sound-button"
        aria-pressed={sound.muted}
        aria-label={sound.muted ? "Unmute sound" : "Mute sound"}
        title={sound.muted ? "Unmute sound (M)" : "Mute sound (M)"}
        onClick={() => {
          const engine = getSound();
          engine.unlock();
          const next = !sound.muted;
          setSound({ muted: next });
          engine.setMuted(next);
          if (!next) engine.click();
        }}
      >
        <Icon className="size-5" />
      </button>
      <input
        type="range"
        className="sound-slider"
        min={0}
        max={100}
        value={Math.round(sound.volume * 100)}
        aria-label="Sound volume"
        style={
          { "--vol": Math.round(sound.volume * 100) } as React.CSSProperties
        }
        onChange={(e) => {
          const engine = getSound();
          engine.unlock();
          const volume = Number(e.target.value) / 100;
          setSound({ muted: volume === 0 ? true : false, volume });
          engine.setVolume(volume);
          engine.setMuted(volume === 0);
        }}
      />
      <span className="sound-value" aria-hidden>
        {sound.muted ? "OFF" : `${Math.round(sound.volume * 100)}`}
      </span>
    </div>
  );
}
