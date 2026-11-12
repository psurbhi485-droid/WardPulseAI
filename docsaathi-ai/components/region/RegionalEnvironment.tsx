"use client";

import React, { useMemo } from "react";
import { RegionTheme, EnvironmentType } from "@/types/region";
import { useRegionalTheme } from "./RegionalThemeProvider";
import { DEFAULT_REGION } from "@/data/regionThemes";

export interface RegionalEnvironmentProps {
  theme?: RegionTheme;
  className?: string;
}

export function RegionalEnvironment({ theme: propTheme, className = "" }: RegionalEnvironmentProps) {
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
  const { colors, environment } = theme;

  const scene = useMemo(
    () => renderScene(environment.type, colors),
    [environment.type, colors]
  );

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 transition-opacity duration-700 ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 w-full h-full opacity-65">
        <style>{CSS_ANIMATIONS}</style>
        <svg
          viewBox="0 0 800 400"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
          role="img"
          aria-label={`${theme.name} landscape`}
        >
          {scene}
        </svg>
      </div>
      {/* Gentle gradient wash so text content on foreground remains 100% accessible and readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,244,236,0.35) 0%, rgba(255,244,236,0.7) 40%, rgba(255,244,236,0.92) 80%, #FFF4EC 100%)",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene renderers by environment type
// ─────────────────────────────────────────────────────────────────────────────

type ColorSet = RegionTheme["colors"];

function renderScene(type: EnvironmentType, c: ColorSet): React.ReactNode {
  switch (type) {
    case "river":    return <RiverScene c={c} />;
    case "coastal":  return <CoastalScene c={c} />;
    case "desert":   return <DesertScene c={c} />;
    case "hills":    return <HillsScene c={c} />;
    case "mountain": return <MountainScene c={c} />;
    case "plains":   return <PlainsScene c={c} />;
    case "forest":   return <ForestScene c={c} />;
    case "island":   return <IslandScene c={c} />;
    case "wetland":  return <WetlandScene c={c} />;
    case "urban":    return <UrbanScene c={c} />;
    default:         return <RiverScene c={c} />;
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Sky({ c }: { c: ColorSet }) {
  return (
    <>
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.skyTop} />
          <stop offset="100%" stopColor={c.skyBottom} />
        </linearGradient>
      </defs>
      <rect width="800" height="400" fill="url(#skyGrad)" />
    </>
  );
}

function Sun({ x = 650, y = 55 }: { x?: number; y?: number }) {
  return (
    <g style={{ animation: "sunPulse 4s ease-in-out infinite" }}>
      <circle cx={x} cy={y} r="30" fill="#FFD580" opacity="0.25" />
      <circle cx={x} cy={y} r="22" fill="#FFD580" opacity="0.35" />
      <circle cx={x} cy={y} r="16" fill="#FFE070" />
    </g>
  );
}

function Cloud({ x, y, scale = 1, speed = "slow" }: { x: number; y: number; scale?: number; speed?: "slow" | "medium" | "fast" }) {
  const dur = speed === "fast" ? "18s" : speed === "medium" ? "28s" : "40s";
  return (
    <g
      transform={`translate(${x},${y}) scale(${scale})`}
      style={{ animation: `cloudFloat ${dur} linear infinite` }}
    >
      <ellipse cx="0" cy="0" rx="40" ry="18" fill="white" opacity="0.7" />
      <ellipse cx="-22" cy="4" rx="26" ry="14" fill="white" opacity="0.65" />
      <ellipse cx="24" cy="5" rx="22" ry="12" fill="white" opacity="0.65" />
    </g>
  );
}

function Birds({ y = 70, count = 5 }: { y?: number; count?: number }) {
  return (
    <g style={{ animation: "birdFly 20s linear infinite" }}>
      {Array.from({ length: count }).map((_, i) => (
        <path
          key={i}
          d={`M ${i * 60 + 20},${y + (i % 3) * 10} q 8,-6 16,0 q 8,-6 16,0`}
          fill="none"
          stroke="#49352E"
          strokeWidth="1.4"
          opacity="0.6"
        />
      ))}
    </g>
  );
}

function WaterStrip({ y, h, c }: { y: number; h: number; c: ColorSet }) {
  return (
    <g>
      <rect x="0" y={y} width="800" height={h} fill={c.waterColor ?? "#5b9fcc"} opacity="0.7" />
      {/* Animated wave ripples */}
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx={200 + i * 200}
          cy={y + h / 2}
          rx="80"
          ry="4"
          fill="white"
          opacity="0.15"
          style={{ animation: `waveRipple ${2.5 + i * 0.4}s ease-in-out infinite alternate` }}
        />
      ))}
    </g>
  );
}

function SimpleTree({ x, y, trunkH = 30, foliageR = 24, fill = "#2d6a4f" }: {
  x: number; y: number; trunkH?: number; foliageR?: number; fill?: string;
}) {
  return (
    <g style={{ transformOrigin: `${x}px ${y}px`, animation: "treeSway 5s ease-in-out infinite" }}>
      <rect x={x - 4} y={y - trunkH} width="8" height={trunkH} fill="#7a5230" rx="2" />
      <circle cx={x} cy={y - trunkH - foliageR + 6} r={foliageR} fill={fill} />
    </g>
  );
}

function PalmTree({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ transformOrigin: `${x}px ${y}px`, animation: "treeSway 6s ease-in-out infinite" }}>
      <path d={`M${x},${y} Q${x + 8},${y - 40} ${x + 2},${y - 80}`} stroke="#8b5e3c" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Fronds */}
      {[-35, -15, 5, 25, 45].map((angle, i) => (
        <path
          key={i}
          d={`M${x + 2},${y - 80} Q${x + 2 + Math.cos((angle * Math.PI) / 180) * 30},${y - 80 + Math.sin((angle * Math.PI) / 180) * 20} ${x + 2 + Math.cos((angle * Math.PI) / 180) * 50},${y - 80 + Math.sin((angle * Math.PI) / 180) * 35}`}
          stroke="#2d7a4f"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />
      ))}
    </g>
  );
}

// ─── RIVER scene ─────────────────────────────────────────────────────────────

function RiverScene({ c }: { c: ColorSet }) {
  return (
    <>
      <Sky c={c} />
      <Sun x={640} y={60} />
      <Cloud x={80} y={50} scale={1} />
      <Cloud x={380} y={35} scale={0.7} speed="medium" />
      <Cloud x={620} y={70} scale={0.85} speed="fast" />
      {/* Background hills */}
      <path d="M0,230 Q100,170 200,220 Q300,170 400,215 Q500,165 600,210 Q700,175 800,220 L800,400 L0,400 Z" fill={c.groundSecondary} opacity="0.6" />
      {/* River strip */}
      <WaterStrip y={245} h={50} c={c} />
      {/* Foreground ground */}
      <path d="M0,290 Q200,270 400,285 Q600,270 800,285 L800,400 L0,400 Z" fill={c.groundPrimary} />
      {/* Trees */}
      <SimpleTree x={80} y={295} fill={c.groundSecondary} />
      <SimpleTree x={130} y={300} foliageR={20} fill={c.groundPrimary} />
      {/* Temple silhouette */}
      <g opacity="0.8" fill={c.accentDark}>
        <rect x="650" y="208" width="30" height="40" />
        <polygon points="650,208 665,185 680,208" />
        <rect x="658" y="195" width="14" height="12" fill={c.accentLight} opacity="0.5" />
      </g>
      {/* Boat */}
      <g style={{ animation: "boatBob 4s ease-in-out infinite" }}>
        <path d="M340,265 Q360,258 380,265 L375,278 L345,278 Z" fill="#8b5e3c" />
        <line x1="360" y1="258" x2="360" y2="245" stroke="#8b5e3c" strokeWidth="2" />
        <path d="M360,245 L376,257 L360,258 Z" fill="#e8c97b" />
      </g>
      <Birds y={80} count={5} />
    </>
  );
}

// ─── COASTAL scene ───────────────────────────────────────────────────────────

function CoastalScene({ c }: { c: ColorSet }) {
  return (
    <>
      <Sky c={c} />
      <Sun x={680} y={55} />
      <Cloud x={100} y={45} scale={1.1} />
      <Cloud x={440} y={30} scale={0.75} speed="medium" />
      {/* Ocean */}
      <rect x="0" y="210" width="800" height="190" fill={c.waterColor ?? "#1b7fc4"} opacity="0.8" />
      {/* Wave layers */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${-80 + i * 20},${240 + i * 20} Q ${80 + i * 10},${228 + i * 20} ${200 + i * 10},${240 + i * 20} Q ${320 + i * 10},${252 + i * 20} ${440 + i * 10},${240 + i * 20} Q ${560 + i * 10},${228 + i * 20} ${680 + i * 10},${240 + i * 20} Q ${800 + i * 10},${252 + i * 20} ${920 + i * 10},${240 + i * 20}`}
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          opacity="0.35"
          style={{ animation: `waveRipple ${3 + i * 0.5}s ease-in-out infinite alternate` }}
        />
      ))}
      {/* Sandy beach */}
      <path d="M0,285 Q200,275 400,280 Q600,275 800,282 L800,400 L0,400 Z" fill="#f5d99a" />
      {/* Lighthouse */}
      <g opacity="0.9">
        <rect x="680" y="200" width="20" height="90" fill="#f8f8f8" rx="2" />
        <rect x="676" y="196" width="28" height="12" fill="#c0392b" rx="2" />
        <rect x="682" y="186" width="16" height="12" fill="#c0392b" rx="2" />
        <rect x="686" y="224" width="8" height="12" fill="#FFD580" opacity="0.7" />
      </g>
      {/* Palm trees on beach */}
      <PalmTree x={120} y={295} />
      <PalmTree x={200} y={290} />
      <Birds y={70} count={4} />
    </>
  );
}

// ─── DESERT scene ────────────────────────────────────────────────────────────

function DesertScene({ c }: { c: ColorSet }) {
  return (
    <>
      <Sky c={c} />
      <Sun x={650} y={60} />
      <Cloud x={80} y={55} scale={0.6} speed="slow" />
      {/* Dunes */}
      <path d="M0,320 Q100,240 200,300 Q300,220 450,290 Q550,230 700,290 Q760,260 800,290 L800,400 L0,400 Z" fill={c.groundSecondary} />
      <path d="M0,350 Q150,300 300,340 Q450,300 600,340 Q700,310 800,340 L800,400 L0,400 Z" fill={c.groundPrimary} />
      {/* Fort silhouette */}
      <g fill={c.accentDark} opacity="0.75">
        <rect x="280" y="210" width="120" height="80" />
        <rect x="276" y="198" width="10" height="20" />
        <rect x="296" y="198" width="10" height="20" />
        <rect x="316" y="198" width="10" height="20" />
        <rect x="336" y="198" width="10" height="20" />
        <rect x="356" y="198" width="10" height="20" />
        <rect x="376" y="198" width="10" height="20" />
        <rect x="384" y="198" width="10" height="20" />
        <rect x="310" y="240" width="30" height="50" fill={c.accentLight} opacity="0.4" />
        {/* Arch */}
        <path d="M310,290 Q325,265 340,290" fill="none" stroke={c.groundPrimary} strokeWidth="2" />
      </g>
      <Birds y={90} count={3} />
    </>
  );
}

// ─── HILLS scene ─────────────────────────────────────────────────────────────

function HillsScene({ c }: { c: ColorSet }) {
  return (
    <>
      <Sky c={c} />
      <Sun x={120} y={70} />
      <Cloud x={300} y={45} scale={1.2} speed="slow" />
      <Cloud x={580} y={60} scale={0.8} speed="medium" />
      {/* Misty background hills */}
      <path d="M0,260 Q100,180 220,240 Q340,160 480,230 Q600,170 720,235 Q760,210 800,230 L800,400 L0,400 Z" fill={c.groundSecondary} opacity="0.4" />
      <path d="M0,290 Q150,210 300,265 Q430,200 560,260 Q680,210 800,255 L800,400 L0,400 Z" fill={c.groundSecondary} opacity="0.6" />
      {/* Foreground hill */}
      <path d="M0,330 Q200,280 400,320 Q600,275 800,320 L800,400 L0,400 Z" fill={c.groundPrimary} />
      {/* Forest silhouette */}
      {[60, 100, 140, 180, 220, 580, 620, 660, 700, 740].map((x, i) => (
        <polygon
          key={i}
          points={`${x},${290 + (i % 3) * 8} ${x + 20},${330 + (i % 3) * 8} ${x - 20},${330 + (i % 3) * 8}`}
          fill={c.groundPrimary}
          opacity="0.85"
          style={{ animation: `treeSway ${4 + (i % 3)}s ease-in-out infinite alternate` }}
        />
      ))}
      <Birds y={100} count={6} />
    </>
  );
}

// ─── MOUNTAIN scene ──────────────────────────────────────────────────────────

function MountainScene({ c }: { c: ColorSet }) {
  return (
    <>
      <Sky c={c} />
      <Sun x={400} y={55} />
      <Cloud x={80} y={70} scale={0.8} />
      <Cloud x={650} y={50} scale={1} speed="medium" />
      {/* Far mountains */}
      <path d="M0,280 L80,160 L160,250 L240,130 L320,230 L400,100 L480,220 L560,140 L640,230 L720,160 L800,240 L800,400 L0,400 Z" fill={c.groundSecondary} opacity="0.5" />
      {/* Snow caps */}
      <path d="M400,100 L430,145 L370,145 Z" fill="white" opacity="0.9" />
      <path d="M240,130 L266,165 L214,165 Z" fill="white" opacity="0.8" />
      <path d="M560,140 L585,172 L535,172 Z" fill="white" opacity="0.8" />
      {/* Mid mountain layer */}
      <path d="M0,310 L100,220 L200,290 L300,210 L400,270 L500,195 L600,265 L700,210 L800,270 L800,400 L0,400 Z" fill={c.groundPrimary} />
      {/* Pines */}
      {[60, 110, 580, 630, 680].map((x, i) => (
        <g key={i}>
          <polygon points={`${x},${295} ${x + 14},${330} ${x - 14},${330}`} fill={c.groundSecondary} opacity="0.9" />
          <polygon points={`${x},${312} ${x + 20},${355} ${x - 20},${355}`} fill={c.groundPrimary} opacity="0.95" />
        </g>
      ))}
      {/* Valley */}
      <rect x="0" y="345" width="800" height="55" fill={c.groundPrimary} opacity="0.7" />
      <Birds y={120} count={4} />
    </>
  );
}

// ─── PLAINS scene ────────────────────────────────────────────────────────────

function PlainsScene({ c }: { c: ColorSet }) {
  return (
    <>
      <Sky c={c} />
      <Sun x={700} y={50} />
      <Cloud x={160} y={40} scale={1.3} speed="slow" />
      <Cloud x={500} y={55} scale={0.9} speed="medium" />
      {/* Wide horizon */}
      <rect x="0" y="250" width="800" height="150" fill={c.groundPrimary} />
      {/* Field strips */}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 200}
          y="250"
          width="200"
          height="150"
          fill={i % 2 === 0 ? c.groundPrimary : c.groundSecondary}
          opacity="0.8"
        />
      ))}
      {/* Horizon tree line */}
      {[50, 110, 160, 220, 580, 640, 700, 760].map((x, i) => (
        <SimpleTree key={i} x={x} y={262} trunkH={20} foliageR={16} fill={c.groundSecondary} />
      ))}
      {/* Windmill */}
      <g opacity="0.75">
        <line x1="400" y1="200" x2="400" y2="255" stroke="#49352E" strokeWidth="4" />
        <circle cx="400" cy="200" r="4" fill="#49352E" />
        <g style={{ transformOrigin: "400px 200px", animation: "windmill 8s linear infinite" }}>
          <line x1="400" y1="175" x2="400" y2="225" stroke="#8b5e3c" strokeWidth="2.5" opacity="0.7" />
          <line x1="375" y1="200" x2="425" y2="200" stroke="#8b5e3c" strokeWidth="2.5" opacity="0.7" />
        </g>
      </g>
      <Birds y={85} count={5} />
    </>
  );
}

// ─── FOREST scene ────────────────────────────────────────────────────────────

function ForestScene({ c }: { c: ColorSet }) {
  return (
    <>
      <Sky c={c} />
      <Sun x={400} y={40} />
      <Cloud x={200} y={30} scale={0.7} speed="slow" />
      {/* Canopy background */}
      <path d="M0,160 Q100,100 200,150 Q300,80 400,140 Q500,90 600,145 Q700,100 800,150 L800,400 L0,400 Z" fill={c.groundSecondary} opacity="0.8" />
      {/* Mid canopy */}
      <path d="M0,200 Q80,150 160,195 Q240,145 320,190 Q400,150 480,190 Q560,145 640,190 Q720,155 800,195 L800,400 L0,400 Z" fill={c.groundPrimary} opacity="0.9" />
      {/* Tree trunks */}
      {[40, 120, 200, 290, 380, 460, 550, 640, 720].map((x, i) => (
        <g key={i}>
          <rect x={x - 10} y={i % 2 === 0 ? 190 : 200} width="20" height={i % 2 === 0 ? 210 : 200} fill="#5a3d1e" opacity="0.7" rx="4" />
        </g>
      ))}
      {/* Forest floor */}
      <rect x="0" y="360" width="800" height="40" fill={c.groundPrimary} opacity="0.6" />
      <Birds y={110} count={3} />
    </>
  );
}

// ─── ISLAND scene ────────────────────────────────────────────────────────────

function IslandScene({ c }: { c: ColorSet }) {
  return (
    <>
      <Sky c={c} />
      <Sun x={650} y={55} />
      <Cloud x={120} y={48} scale={0.9} />
      {/* Turquoise ocean */}
      <rect x="0" y="200" width="800" height="200" fill={c.waterColor ?? "#00b4d8"} opacity="0.75" />
      {/* Island land mass */}
      <ellipse cx="400" cy="310" rx="220" ry="80" fill="#f5d99a" />
      <ellipse cx="400" cy="295" rx="180" ry="55" fill={c.groundPrimary} />
      {/* Ocean ripples */}
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx="400"
          cy={240 + i * 25}
          rx={300 + i * 50}
          ry="10"
          fill="white"
          opacity="0.12"
          style={{ animation: `waveRipple ${3 + i * 0.5}s ease-in-out infinite alternate` }}
        />
      ))}
      {/* Palm trees */}
      <PalmTree x={320} y={300} />
      <PalmTree x={400} y={295} />
      <PalmTree x={480} y={298} />
      <Birds y={75} count={4} />
    </>
  );
}

// ─── WETLAND scene ───────────────────────────────────────────────────────────

function WetlandScene({ c }: { c: ColorSet }) {
  return (
    <>
      <Sky c={c} />
      <Sun x={150} y={65} />
      <Cloud x={380} y={40} scale={1} speed="slow" />
      {/* Still water */}
      <rect x="0" y="210" width="800" height="190" fill={c.waterColor ?? "#4db8c7"} opacity="0.6" />
      {/* Reed grasses */}
      {[80, 140, 200, 580, 640, 700].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="280" x2={x + (i % 2 === 0 ? 5 : -5)} y2="210" stroke={c.groundPrimary} strokeWidth="3" />
          <ellipse cx={x + (i % 2 === 0 ? 5 : -5)} cy="208" rx="4" ry="10" fill={c.accentDark} opacity="0.7" />
        </g>
      ))}
      {/* Lotus flowers */}
      {[300, 400, 500].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="250" r="10" fill="#f4a2b8" opacity="0.8" />
          <circle cx={x - 10} cy="255" r="8" fill="#f4a2b8" opacity="0.6" />
          <circle cx={x + 10} cy="255" r="8" fill="#f4a2b8" opacity="0.6" />
          <ellipse cx={x} cy="265" rx="20" ry="6" fill={c.groundPrimary} opacity="0.5" />
        </g>
      ))}
      {/* Muddy shore */}
      <path d="M0,370 Q200,355 400,365 Q600,355 800,368 L800,400 L0,400 Z" fill={c.groundPrimary} />
      <Birds y={85} count={5} />
    </>
  );
}

// ─── URBAN scene ─────────────────────────────────────────────────────────────

function UrbanScene({ c }: { c: ColorSet }) {
  const buildings = [
    { x: 20,  w: 60,  h: 120 },
    { x: 90,  w: 80,  h: 180 },
    { x: 180, w: 50,  h: 90  },
    { x: 240, w: 90,  h: 210 },
    { x: 340, w: 60,  h: 150 },
    { x: 410, w: 100, h: 240 },
    { x: 520, w: 70,  h: 170 },
    { x: 600, w: 55,  h: 100 },
    { x: 665, w: 80,  h: 190 },
    { x: 755, w: 50,  h: 130 },
  ];

  return (
    <>
      <Sky c={c} />
      <Sun x={700} y={50} />
      <Cloud x={80} y={40} scale={0.8} speed="medium" />
      <Cloud x={360} y={30} scale={0.65} speed="fast" />
      {/* Background buildings */}
      {buildings.map((b, i) => (
        <g key={i}>
          <rect
            x={b.x}
            y={400 - b.h}
            width={b.w}
            height={b.h}
            fill={i % 3 === 0 ? c.accentDark : i % 3 === 1 ? c.groundPrimary : "#7a6e65"}
            opacity="0.85"
            rx="2"
          />
          {/* Windows */}
          {Array.from({ length: Math.floor(b.h / 30) }).map((_, j) => (
            <rect
              key={j}
              x={b.x + 8 + (j % 2) * (b.w / 2 - 10)}
              y={400 - b.h + 15 + j * 28}
              width={b.w / 3}
              height="12"
              fill={c.accentLight}
              opacity="0.5"
              rx="1"
            />
          ))}
        </g>
      ))}
      {/* Heritage arch / temple in foreground */}
      <g fill={c.accentDark} opacity="0.9">
        <rect x="360" y="250" width="80" height="150" rx="2" />
        <path d="M355,250 Q400,215 445,250" fill={c.accentDark} />
        <rect x="380" y="270" width="40" height="60" fill={c.accentLight} opacity="0.4" rx="2" />
        <path d="M380,330 Q400,315 420,330" fill="none" stroke={c.groundPrimary} strokeWidth="2" />
      </g>
      {/* Street */}
      <rect x="0" y="380" width="800" height="20" fill="#6b6560" />
      <Birds y={70} count={4} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS Animations (respects prefers-reduced-motion)
// ─────────────────────────────────────────────────────────────────────────────

const CSS_ANIMATIONS = `
  @keyframes cloudFloat {
    from { transform: translateX(0); }
    to   { transform: translateX(900px); }
  }
  @keyframes birdFly {
    from { transform: translate(-200px, 0); }
    to   { transform: translate(900px, -30px); }
  }
  @keyframes waveRipple {
    from { opacity: 0.1; transform: scaleX(0.95); }
    to   { opacity: 0.3; transform: scaleX(1.05); }
  }
  @keyframes boatBob {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-5px); }
  }
  @keyframes treeSway {
    0%, 100% { transform: rotate(-1.5deg); }
    50%       { transform: rotate(1.5deg); }
  }
  @keyframes sunPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.75; }
  }
  @keyframes windmill {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
`;
