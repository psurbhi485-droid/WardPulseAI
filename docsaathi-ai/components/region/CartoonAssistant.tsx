"use client";

import React, { useState, useEffect } from "react";
import { RegionTheme, AssistantState } from "@/types/region";
import { useRegionalTheme } from "./RegionalThemeProvider";
import { DEFAULT_REGION } from "@/data/regionThemes";

export interface CartoonAssistantProps {
  theme?: RegionTheme;
  state?: AssistantState;
  className?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showSpeechBubble?: boolean;
}

export function CartoonAssistant({
  theme: propTheme,
  state = "idle",
  className = "",
  size = "md",
  onClick,
  showSpeechBubble = false,
}: CartoonAssistantProps) {
  let contextTheme: RegionTheme = DEFAULT_REGION;
  try {
    const ctx = useRegionalTheme();
    if (ctx && ctx.theme) {
      contextTheme = ctx.theme;
    }
  } catch {
    // outside provider
  }

  const theme = propTheme || contextTheme;
  const [isBlinking, setIsBlinking] = useState(false);

  // Periodic natural blinking
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const dimensions = {
    sm: { w: 100, h: 120 },
    md: { w: 150, h: 180 },
    lg: { w: 200, h: 240 },
  }[size];

  // Accessory rendering based on theme.character.accessory
  const accessory = theme.character?.accessory?.toLowerCase() || "";
  const prop = theme.character?.prop?.toLowerCase() || "";
  const colors = theme.colors;

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <style>{`
        @keyframes waveHand {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-24deg); }
          40% { transform: rotate(-6deg); }
          60% { transform: rotate(-28deg); }
          80% { transform: rotate(-10deg); }
        }
        @keyframes floatIdle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes mouthTalk {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.3); }
        }
        @keyframes earListenPulse {
          0%, 100% { r: 5; opacity: 0.4; }
          50% { r: 10; opacity: 0.9; }
        }
        @keyframes thinkSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .anim-wave {
          transform-origin: 35px 82px;
          animation: waveHand 1.6s ease-in-out infinite;
        }
        .anim-idle {
          animation: floatIdle 3.2s ease-in-out infinite;
        }
        .anim-mouth {
          transform-origin: 65px 74px;
          animation: mouthTalk 0.35s ease-in-out infinite alternate;
        }
        .anim-listen-pulse {
          animation: earListenPulse 1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-wave, .anim-idle, .anim-mouth, .anim-listen-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* Interactive Speech / State Bubble */}
      {showSpeechBubble && (
        <div
          className="mb-2 px-3 py-1.5 rounded-xl shadow-md text-xs font-semibold animate-fade-in flex items-center gap-1.5"
          style={{
            backgroundColor: "#FFFFFF",
            border: `1.5px solid ${colors.accentLight || "#F8DCCB"}`,
            color: "#49352E",
          }}
        >
          {state === "listening" && <span className="text-red-500 animate-pulse">● Listening...</span>}
          {state === "thinking" && <span className="text-amber-600 animate-pulse">✦ Analyzing document...</span>}
          {state === "speaking" && <span className="text-emerald-600">🔊 Explaining in {theme.languages[0]}</span>}
          {state === "welcome" && <span>👋 {theme.welcomeMessage}</span>}
          {state === "idle" && <span>✨ Saathi is ready to help</span>}
        </div>
      )}

      {/* SVG Cartoon Character */}
      <svg
        width={dimensions.w}
        height={dimensions.h}
        viewBox="0 0 130 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`filter drop-shadow-md transition-transform duration-300 ${
          state === "idle" || state === "welcome" ? "anim-idle" : ""
        }`}
        aria-label={`DocSaathi Assistant for ${theme.name}`}
      >
        <defs>
          {/* Skin tone gradient */}
          <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F9D4B8" />
            <stop offset="100%" stopColor="#E5B592" />
          </linearGradient>

          {/* Hair gradient */}
          <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A2822" />
            <stop offset="100%" stopColor="#1C1411" />
          </linearGradient>

          {/* Outfit: Peach / DocSaathi brand terracotta with regional accent */}
          <linearGradient id="shirtGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C47C60" />
            <stop offset="60%" stopColor="#B3694E" />
            <stop offset="100%" stopColor={colors.accentDark || "#49352E"} />
          </linearGradient>

          {/* Cheeks blush */}
          <radialGradient id="blushGrad">
            <stop offset="0%" stopColor="#FF8B8B" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FF8B8B" stopOpacity="0" />
          </radialGradient>

          {/* Halo Glow */}
          <radialGradient id="haloGlow">
            <stop offset="0%" stopColor={colors.accentLight || "#FFD580"} stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Glow */}
        <circle cx="65" cy="70" r="58" fill="url(#haloGlow)" />

        {/* State-specific Aura effects */}
        {state === "listening" && (
          <g>
            <circle cx="98" cy="62" r="8" fill="none" stroke="#E05C3A" strokeWidth="2" className="anim-listen-pulse" />
            <circle cx="98" cy="62" r="14" fill="none" stroke="#E05C3A" strokeWidth="1.5" opacity="0.6" className="anim-listen-pulse" />
          </g>
        )}

        {state === "thinking" && (
          <g transform="translate(88, 25)">
            <circle cx="0" cy="0" r="3" fill="#EBAF91" />
            <circle cx="6" cy="-8" r="4.5" fill="#C47C60" />
            <circle cx="15" cy="-14" r="6.5" fill="#49352E" />
            <path d="M12,-16 Q15,-18 18,-14" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}

        {/* ── BACK BODY / LEGS ── */}
        <path d="M48,135 L48,154 Q48,158 55,158 Q62,158 62,154 L62,135 Z" fill="#2E2320" />
        <path d="M68,135 L68,154 Q68,158 75,158 Q82,158 82,154 L82,135 Z" fill="#2E2320" />

        {/* ── TORSO / OUTFIT ── */}
        {/* Main Kurta / Shirt in DocSaathi Terracotta */}
        <path
          d="M38,98 Q42,88 65,88 Q88,88 92,98 L96,138 Q65,142 34,138 Z"
          fill="url(#shirtGrad)"
          stroke="#49352E"
          strokeWidth="1.2"
        />

        {/* Nehru collar / V-neck */}
        <path d="M56,88 L65,102 L74,88" fill="#F8DCCB" stroke="#49352E" strokeWidth="1.2" />
        <line x1="65" y1="102" x2="65" y2="135" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2,3" />

        {/* ── REGIONAL ACCESSORY (Torso/Neck) ── */}
        {/* Gamcha / Angavastram / Shawl / Kasavu draped over shoulder */}
        {(accessory.includes("gamcha") ||
          accessory.includes("angavastram") ||
          accessory.includes("shawl") ||
          accessory.includes("kasavu") ||
          accessory.includes("dhoti") ||
          accessory.includes("dupatta") ||
          accessory.includes("stole")) && (
          <g>
            <path
              d="M44,88 Q50,110 52,138 L60,138 Q56,110 50,88 Z"
              fill={colors.accentLight || "#FF9B6A"}
              stroke={colors.accentDark || "#C47C60"}
              strokeWidth="1"
            />
            {/* Fringe details */}
            <line x1="52" y1="138" x2="52" y2="142" stroke={colors.accentDark} strokeWidth="1" />
            <line x1="56" y1="138" x2="56" y2="142" stroke={colors.accentDark} strokeWidth="1" />
            <line x1="60" y1="138" x2="60" y2="142" stroke={colors.accentDark} strokeWidth="1" />
          </g>
        )}

        {/* ── ARMS ── */}
        {/* Right arm (rests or holds prop) */}
        {state === "thinking" ? (
          // Right arm raised touching chin
          <g>
            <path
              d="M92,96 Q100,105 92,118 Q84,120 74,106 L78,98"
              fill="url(#shirtGrad)"
              stroke="#49352E"
              strokeWidth="1.2"
            />
            <circle cx="75" cy="78" r="6" fill="url(#skinGrad)" stroke="#49352E" strokeWidth="1" />
          </g>
        ) : (
          // Right arm resting at side
          <g>
            <path
              d="M92,96 Q102,110 98,126 L91,125 Q94,110 88,98 Z"
              fill="url(#shirtGrad)"
              stroke="#49352E"
              strokeWidth="1.2"
            />
            <circle cx="96" cy="128" r="5" fill="url(#skinGrad)" />
          </g>
        )}

        {/* Left Arm: Waving if state === "welcome", else resting */}
        {state === "welcome" ? (
          <g className="anim-wave">
            {/* Upper arm raised */}
            <path
              d="M38,96 Q24,80 20,62 L28,60 Q32,76 44,94 Z"
              fill="url(#shirtGrad)"
              stroke="#49352E"
              strokeWidth="1.2"
            />
            {/* Forearm & Open hand waving */}
            <path
              d="M20,62 Q16,50 18,44 Q22,40 26,46 L27,60 Z"
              fill="url(#skinGrad)"
              stroke="#49352E"
              strokeWidth="1"
            />
            {/* Fingers */}
            <circle cx="17" cy="42" r="2.5" fill="url(#skinGrad)" />
            <circle cx="21" cy="40" r="2.5" fill="url(#skinGrad)" />
            <circle cx="25" cy="41" r="2.5" fill="url(#skinGrad)" />
          </g>
        ) : (
          // Left arm resting
          <g>
            <path
              d="M38,96 Q28,110 32,126 L39,125 Q36,110 42,98 Z"
              fill="url(#shirtGrad)"
              stroke="#49352E"
              strokeWidth="1.2"
            />
            <circle cx="34" cy="128" r="5" fill="url(#skinGrad)" />
          </g>
        )}

        {/* Regional Prop in Hand (e.g. scroll, lotus, palm leaf) */}
        {prop.includes("scroll") && (
          <g transform="translate(90, 118) rotate(15)">
            <rect x="0" y="0" width="8" height="20" rx="3" fill="#FFF4EC" stroke="#C47C60" strokeWidth="1" />
            <line x1="2" y1="4" x2="6" y2="4" stroke="#C47C60" strokeWidth="0.8" />
            <line x1="2" y1="8" x2="6" y2="8" stroke="#C47C60" strokeWidth="0.8" />
          </g>
        )}
        {prop.includes("lotus") && (
          <g transform="translate(92, 116)">
            <path d="M0,8 Q5,0 10,8 Q5,4 0,8 Z" fill="#FF8BA7" />
            <path d="M-3,8 Q5,-4 13,8 Z" fill="#FFB3C6" opacity="0.8" />
          </g>
        )}

        {/* ── NECK ── */}
        <rect x="59" y="78" width="12" height="14" rx="3" fill="url(#skinGrad)" />

        {/* ── EARS ── */}
        <ellipse cx="37" cy="62" rx="4.5" ry="6" fill="url(#skinGrad)" stroke="#49352E" strokeWidth="1" />
        <ellipse cx="93" cy="62" rx="4.5" ry="6" fill="url(#skinGrad)" stroke="#49352E" strokeWidth="1" />

        {/* ── HEAD ── */}
        <path
          d="M38,56 Q36,80 65,80 Q94,80 92,56 Q92,30 65,30 Q38,30 38,56 Z"
          fill="url(#skinGrad)"
          stroke="#49352E"
          strokeWidth="1.4"
        />

        {/* Rosy Cheeks */}
        <circle cx="48" cy="66" r="7" fill="url(#blushGrad)" />
        <circle cx="82" cy="66" r="7" fill="url(#blushGrad)" />

        {/* ── HAIR (Base cartoon cut) ── */}
        <path
          d="M36,50 Q36,25 65,24 Q94,25 94,50 Q94,40 86,34 Q65,36 44,34 Q36,40 36,50 Z"
          fill="url(#hairGrad)"
        />
        {/* Forehead fringe strand */}
        <path d="M46,34 Q54,42 62,35 Q70,44 78,34" fill="none" stroke="url(#hairGrad)" strokeWidth="3" />

        {/* ── REGIONAL HEADWEAR / ACCESSORY ── */}
        {/* Pagdi / Turban (Rajasthan, Punjab, Haryana, etc.) */}
        {(accessory.includes("pagdi") ||
          accessory.includes("turban") ||
          accessory.includes("pheta") ||
          accessory.includes("safaa")) && (
          <g>
            {/* Turban wraps */}
            <path
              d="M33,38 Q33,16 65,14 Q97,16 97,38 Q85,24 65,26 Q45,24 33,38 Z"
              fill={colors.accentDark || "#C87941"}
              stroke="#2E2320"
              strokeWidth="1.2"
            />
            <path
              d="M36,28 Q65,10 94,28 Q80,18 65,19 Q50,18 36,28 Z"
              fill={colors.accentLight || "#FF9B6A"}
            />
            {/* Crest / Kalgi gem */}
            <circle cx="65" cy="20" r="3.5" fill="#FFE070" stroke="#C47C60" strokeWidth="1" />
          </g>
        )}

        {/* Himachali / Ladakhi Cap */}
        {(accessory.includes("himachali") ||
          accessory.includes("cap") ||
          accessory.includes("topi") ||
          accessory.includes("karakul")) && (
          <g>
            <path
              d="M36,34 L94,34 L90,18 L40,18 Z"
              fill="#3A4A3E"
              stroke="#1C1411"
              strokeWidth="1.2"
            />
            <rect x="36" y="28" width="58" height="6" fill={colors.accentLight || "#90EE90"} />
          </g>
        )}

        {/* Tilak / Bindi / Chandan (culturally respectful subtle mark) */}
        {theme.id === "uttar-pradesh" || theme.id === "odisha" ? (
          <path d="M64,40 L66,40 L65,46 Z" fill="#C47C60" />
        ) : null}

        {/* ── EYES ── */}
        {isBlinking ? (
          // Blinking: cute curved lines
          <g stroke="#3A2822" strokeWidth="2" strokeLinecap="round">
            <path d="M48,56 Q53,60 58,56" fill="none" />
            <path d="M72,56 Q77,60 82,56" fill="none" />
          </g>
        ) : (
          // Open big friendly cartoon eyes
          <g>
            {/* Eye whites */}
            <ellipse cx="53" cy="55" rx="5.5" ry="6.5" fill="#FFFFFF" />
            <ellipse cx="77" cy="55" rx="5.5" ry="6.5" fill="#FFFFFF" />

            {/* Dark Irises */}
            <ellipse cx="54" cy="55" rx="3.8" ry="4.5" fill="#2E1C15" />
            <ellipse cx="78" cy="55" rx="3.8" ry="4.5" fill="#2E1C15" />

            {/* Sparkle highlights */}
            <circle cx="55.5" cy="53" r="1.6" fill="#FFFFFF" />
            <circle cx="52.5" cy="57" r="0.8" fill="#FFFFFF" />
            <circle cx="79.5" cy="53" r="1.6" fill="#FFFFFF" />
            <circle cx="76.5" cy="57" r="0.8" fill="#FFFFFF" />

            {/* Eyebrows */}
            <path
              d={state === "thinking" ? "M48,47 Q53,44 58,48" : "M48,46 Q53,43 58,46"}
              fill="none"
              stroke="#3A2822"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d={state === "thinking" ? "M72,49 Q77,44 82,45" : "M72,46 Q77,43 82,46"}
              fill="none"
              stroke="#3A2822"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* ── NOSE ── */}
        <path d="M64,59 Q65,63 67,62" fill="none" stroke="#C48C6E" strokeWidth="1.4" strokeLinecap="round" />

        {/* ── MOUTH ── */}
        {state === "speaking" ? (
          // Animated speaking mouth
          <ellipse
            cx="65"
            cy="72"
            rx="5"
            ry="4.5"
            fill="#7C2D25"
            stroke="#49352E"
            strokeWidth="1"
            className="anim-mouth"
          />
        ) : state === "thinking" ? (
          // Thinking pursed mouth
          <path d="M62,71 Q66,73 69,70" fill="none" stroke="#49352E" strokeWidth="1.8" strokeLinecap="round" />
        ) : (
          // Warm smiling mouth
          <path
            d="M58,69 Q65,77 72,69"
            fill="#C4574E"
            stroke="#49352E"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}
