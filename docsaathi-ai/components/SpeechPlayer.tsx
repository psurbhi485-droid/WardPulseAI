"use client";

import React from "react";
import type { SpeechState } from "@/types";
import { Waveform } from "./Waveform";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";

interface SpeechPlayerProps {
  text: string;
  speechState: SpeechState;
  isSupported: boolean;
  speechLang?: string;
  currentRate: number;
  onRateChange: (rate: number) => void;
  onPlay: (text: string, lang?: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReplay: (lang?: string) => void;
  showSpeedControl?: boolean;
  className?: string;
}

export function SpeechPlayer({
  text,
  speechState,
  isSupported,
  speechLang,
  currentRate,
  onRateChange,
  onPlay,
  onPause,
  onResume,
  onStop,
  onReplay,
  showSpeedControl = true,
  className = "",
}: SpeechPlayerProps) {
  const isPlaying = speechState === "playing";
  const isPaused = speechState === "paused";
  const isLoading = speechState === "loading";
  const isActive = isPlaying || isPaused || isLoading;

  if (!isSupported) {
    return (
      <div
        className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${className}`}
        style={{ background: "#F8DCCB", color: "#8b6358" }}
      >
        <VolumeX className="w-4 h-4" />
        <span>Text-to-speech not supported in this browser</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 ${className}`}
      style={{ background: "#FFF4EC", border: "1.5px solid #EBAF91" }}
      role="group"
      aria-label="Speech controls"
    >
      {/* Listen / Play button */}
      {!isActive ? (
        <button
          onClick={() => onPlay(text, speechLang)}
          className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #C47C60, #EBAF91)",
            color: "#fff",
          }}
          aria-label="Listen to response"
        >
          <Volume2 className="w-4 h-4" />
          <span>Listen</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          {/* Loading */}
          {isLoading && (
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: "#C47C60" }}
            />
          )}

          {/* Waveform while playing */}
          {isPlaying && (
            <Waveform
              active={true}
              barCount={5}
              color="#C47C60"
              height={20}
            />
          )}

          {/* Pause / Resume */}
          {isPlaying ? (
            <button
              onClick={onPause}
              className="p-1.5 rounded-lg transition-all hover:scale-110"
              style={{ color: "#C47C60" }}
              aria-label="Pause"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          ) : isPaused ? (
            <button
              onClick={onResume}
              className="p-1.5 rounded-lg transition-all hover:scale-110"
              style={{ color: "#C47C60" }}
              aria-label="Resume"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          ) : null}

          {/* Stop */}
          <button
            onClick={onStop}
            className="p-1.5 rounded-lg transition-all hover:scale-110"
            style={{ color: "#8b6358" }}
            aria-label="Stop"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      )}

      {/* Replay */}
      {!isLoading && (
        <button
          onClick={() => onReplay(speechLang)}
          className="p-1.5 rounded-lg transition-all hover:scale-110 opacity-70 hover:opacity-100"
          style={{ color: "#C47C60" }}
          aria-label="Replay from start"
          title="Replay"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      {/* Speed control */}
      {showSpeedControl && (
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs" style={{ color: "#8b6358" }}>
            Speed:
          </span>
          {[0.75, 1, 1.25, 1.5].map((r) => (
            <button
              key={r}
              onClick={() => onRateChange(r)}
              className={`text-xs font-medium px-2 py-1 rounded-md transition-all ${
                currentRate === r ? "font-bold" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                background: currentRate === r ? "#C47C60" : "transparent",
                color: currentRate === r ? "#fff" : "#8b6358",
              }}
              aria-label={`Set speed to ${r}x`}
              aria-pressed={currentRate === r}
            >
              {r}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
