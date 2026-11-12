"use client";

import React from "react";

interface WaveformProps {
  active: boolean;
  barCount?: number;
  color?: string;
  height?: number;
  className?: string;
}

export function Waveform({
  active,
  barCount = 7,
  color = "#C47C60",
  height = 32,
  className = "",
}: WaveformProps) {
  const delays = [0, 0.15, 0.3, 0.1, 0.25, 0.05, 0.2];
  const heights = [0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.75];

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 4,
            backgroundColor: color,
            height: active
              ? `${heights[i % heights.length] * 100}%`
              : "30%",
            transformOrigin: "bottom",
            transition: "height 0.2s ease",
            animation: active
              ? `waveform 0.8s ease-in-out infinite ${delays[i % delays.length]}s`
              : "none",
          }}
        />
      ))}
    </div>
  );
}
