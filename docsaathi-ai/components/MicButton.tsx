"use client";

import React from "react";
import type { MicState } from "@/types";
import { Waveform } from "./Waveform";
import { Mic, MicOff, Loader2, Square } from "lucide-react";

interface MicButtonProps {
  micState: MicState;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-10 h-10 text-sm",
  md: "w-14 h-14 text-base",
  lg: "w-20 h-20 text-lg",
  xl: "w-28 h-28 text-xl",
};

const STATE_CONFIG: Record<
  MicState,
  { bg: string; label: string; iconColor: string; ringColor: string }
> = {
  idle: {
    bg: "linear-gradient(135deg, #C47C60, #EBAF91)",
    label: "Tap to speak",
    iconColor: "#fff",
    ringColor: "rgba(196,124,96,0.3)",
  },
  listening: {
    bg: "linear-gradient(135deg, #e05c3a, #C47C60)",
    label: "Listening...",
    iconColor: "#fff",
    ringColor: "rgba(224,92,58,0.4)",
  },
  processing: {
    bg: "linear-gradient(135deg, #8b6358, #C47C60)",
    label: "Processing...",
    iconColor: "#fff",
    ringColor: "rgba(139,99,88,0.3)",
  },
  speaking: {
    bg: "linear-gradient(135deg, #5a8f6b, #7cbf8e)",
    label: "Speaking...",
    iconColor: "#fff",
    ringColor: "rgba(90,143,107,0.3)",
  },
  error: {
    bg: "linear-gradient(135deg, #bf5a5a, #e07a7a)",
    label: "Error – tap to retry",
    iconColor: "#fff",
    ringColor: "rgba(191,90,90,0.3)",
  },
};

export function MicButton({
  micState,
  isSupported,
  onStart,
  onStop,
  onCancel,
  size = "lg",
  showLabel = true,
  className = "",
}: MicButtonProps) {
  const config = STATE_CONFIG[micState];
  const isListening = micState === "listening";
  const isProcessing = micState === "processing";

  if (!isSupported) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div
          className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center opacity-40`}
          style={{ background: "linear-gradient(135deg, #EBAF91, #C47C60)" }}
          title="Speech recognition not supported"
        >
          <MicOff className="w-6 h-6 text-white" />
        </div>
        {showLabel && (
          <span className="text-xs" style={{ color: "#C47C60" }}>
            Voice not supported – please type
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Outer ring animation */}
      {isListening && (
        <div className="absolute">
          <div
            className="rounded-full animate-pulse-ring"
            style={{
              width: size === "xl" ? 128 : size === "lg" ? 100 : 72,
              height: size === "xl" ? 128 : size === "lg" ? 100 : 72,
              background: config.ringColor,
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      )}

      <div className="relative flex items-center justify-center">
        <button
          onClick={isListening ? onStop : onStart}
          aria-label={isListening ? "Stop listening" : "Start voice input"}
          aria-pressed={isListening}
          className={`
            ${SIZE_CLASSES[size]} rounded-full flex items-center justify-center
            shadow-lg hover:shadow-xl active:scale-95 relative
            transition-all duration-200 focus:outline-none focus-visible:ring-4
          `}
          style={{
            background: config.bg,
          }}
          disabled={isProcessing}
        >
          {isListening ? (
            <Square className="w-6 h-6 fill-current" style={{ color: config.iconColor }} />
          ) : isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: config.iconColor }} />
          ) : (
            <Mic className="w-6 h-6" style={{ color: config.iconColor }} />
          )}

          {/* Pulsing ring when listening */}
          {isListening && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: config.bg }}
            />
          )}
        </button>
      </div>

      {/* Waveform display */}
      {isListening && (
        <Waveform active={true} barCount={9} color="#C47C60" height={28} />
      )}

      {showLabel && (
        <span
          className="text-xs font-medium text-center"
          style={{ color: micState === "error" ? "#bf5a5a" : "#C47C60" }}
        >
          {config.label}
        </span>
      )}

      {/* Cancel button when active */}
      {(isListening || isProcessing) && (
        <button
          onClick={onCancel}
          className="text-xs underline opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "#C47C60" }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
