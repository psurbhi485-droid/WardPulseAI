"use client";

import React from "react";
import { useRegionalTheme } from "./RegionalThemeProvider";

export function ThemeTransition() {
  const { isTransitioning, theme } = useRegionalTheme();

  if (!isTransitioning) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center transition-opacity duration-300"
      aria-hidden="true"
      style={{
        background: `radial-gradient(circle at center, rgba(255, 244, 236, 0.85) 0%, rgba(248, 220, 203, 0.92) 100%)`,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "fadeCross 600ms ease-in-out forwards",
      }}
    >
      <style>{`
        @keyframes fadeCross {
          0% { opacity: 0; transform: scale(0.98); }
          35% { opacity: 1; transform: scale(1); }
          70% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.02); }
        }
        @keyframes spinCompass {
          0% { transform: rotate(0deg) scale(0.9); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .anim-compass {
          animation: spinCompass 600ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-compass { animation: none !important; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-3 text-center px-6 py-4 rounded-2xl bg-white/90 shadow-xl border border-peach/60">
        <div className="text-4xl anim-compass">{theme.emoji || "✨"}</div>
        <div>
          <p className="text-xs uppercase tracking-wider font-bold" style={{ color: theme.colors.accentDark || "#C47C60" }}>
            Entering
          </p>
          <h3 className="text-xl font-extrabold" style={{ color: "#49352E" }}>
            {theme.name}
          </h3>
          <p className="text-xs mt-0.5 opacity-80" style={{ color: "#8b6358" }}>
            {theme.tagline}
          </p>
        </div>
      </div>
    </div>
  );
}
