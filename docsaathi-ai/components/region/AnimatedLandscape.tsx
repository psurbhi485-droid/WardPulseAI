// ============================================================
// DocSaathi AI — AnimatedLandscape
// SVG rendering engine for regional environments
// ============================================================

import React from "react";
import type { EnvironmentConfig, RegionColors } from "@/types/region";

interface Props {
  config: EnvironmentConfig;
  colors: RegionColors;
}

// ── helpers ──────────────────────────────────────────────────

function hasLayer(
  config: EnvironmentConfig,
  layerType: string
): boolean {
  return config.animatedLayers.some((l) => l.type === layerType);
}

function cloudDriftDuration(
  index: number,
  speed: string | undefined
): number {
  const base = speed === "fast" ? 18 : speed === "slow" ? 42 : 28;
  return base + index * 7;
}

// ── Layer: Sky gradient ───────────────────────────────────────

function SkyLayer({
  id,
  colors,
}: {
  id: string;
  colors: RegionColors;
}) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-skyGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.skyTop} />
          <stop offset="100%" stopColor={colors.skyBottom} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="800" height="300" fill={`url(#${id}-skyGrad)`} />
    </>
  );
}

// ── Layer: Sun / Moon ─────────────────────────────────────────

function SunMoonLayer({
  timeOfDay,
}: {
  timeOfDay: EnvironmentConfig["timeOfDay"];
}) {
  if (timeOfDay === "sunrise") {
    return (
      <g>
        {/* glow */}
        <circle cx="80" cy="220" r="55" fill="#FFCC44" opacity="0.18" />
        <circle cx="80" cy="220" r="38" fill="#FFB347" opacity="0.3" />
        <circle cx="80" cy="220" r="24" fill="#FFD700" opacity="0.9" />
        {/* rays */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const x1 = 80 + 28 * Math.cos(angle);
          const y1 = 220 + 28 * Math.sin(angle);
          const x2 = 80 + 50 * Math.cos(angle);
          const y2 = 220 + 50 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#FFD700"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.7"
            />
          );
        })}
      </g>
    );
  }

  if (timeOfDay === "day") {
    return (
      <g>
        <circle cx="680" cy="55" r="30" fill="#FFF5A0" opacity="0.95" />
        <circle cx="680" cy="55" r="38" fill="#FFE066" opacity="0.18" />
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const x1 = 680 + 34 * Math.cos(angle);
          const y1 = 55 + 34 * Math.sin(angle);
          const x2 = 680 + 50 * Math.cos(angle);
          const y2 = 55 + 50 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#FFE066"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            />
          );
        })}
      </g>
    );
  }

  if (timeOfDay === "sunset" || timeOfDay === "dusk") {
    return (
      <g>
        {/* large warm sun at right horizon */}
        <circle cx="700" cy="210" r="52" fill="#FF6B35" opacity="0.22" />
        <circle cx="700" cy="210" r="38" fill="#FF8C42" opacity="0.4" />
        <circle cx="700" cy="210" r="26" fill="#FFB347" opacity="0.95" />
        {/* horizon glow */}
        <ellipse cx="700" cy="250" rx="120" ry="22" fill="#FF6B35" opacity="0.18" />
      </g>
    );
  }

  return null;
}

// ── Layer: Clouds ─────────────────────────────────────────────

interface CloudData {
  x: number;
  y: number;
  scale: number;
  delay: number;
  dur: number;
}

function CloudLayer({ config }: { config: EnvironmentConfig }) {
  const cloudLayer = config.animatedLayers.find((l) => l.type === "clouds");
  const count = cloudLayer?.count ?? 4;
  const speed = cloudLayer?.speed;

  const clouds: CloudData[] = Array.from({ length: Math.min(count + 2, 6) }).map(
    (_, i) => ({
      x: -120 + i * 160,
      y: 20 + (i % 3) * 25,
      scale: 0.7 + (i % 3) * 0.2,
      delay: -(i * 9),
      dur: cloudDriftDuration(i, speed),
    })
  );

  return (
    <>
      {clouds.map((c, i) => (
        <g
          key={i}
          transform={`translate(${c.x}, ${c.y}) scale(${c.scale})`}
          opacity="0.75"
          style={{
            willChange: "transform",
            animation: `cloudDrift ${c.dur}s ${c.delay}s linear infinite`,
          }}
        >
          {/* cloud shape: overlapping rounded rects */}
          <ellipse cx="50" cy="22" rx="40" ry="18" fill="white" />
          <ellipse cx="80" cy="18" rx="30" ry="16" fill="#f8f8ff" />
          <ellipse cx="25" cy="22" rx="22" ry="14" fill="white" />
          <ellipse cx="60" cy="28" rx="45" ry="12" fill="white" />
        </g>
      ))}
    </>
  );
}

// ── Layer: Birds ──────────────────────────────────────────────

function BirdsLayer({ config }: { config: EnvironmentConfig }) {
  if (!hasLayer(config, "birds")) return null;

  const birdLayer = config.animatedLayers.find((l) => l.type === "birds");
  const count = Math.min(birdLayer?.count ?? 5, 7);
  const speed = birdLayer?.speed === "fast" ? 14 : birdLayer?.speed === "slow" ? 28 : 20;

  const birds = Array.from({ length: count }).map((_, i) => ({
    x: -60 - i * 90,
    y: 40 + (i % 4) * 18,
    scale: 0.6 + (i % 3) * 0.2,
    delay: -(i * 4),
    dur: speed + i * 3,
  }));

  return (
    <>
      {birds.map((b, i) => (
        <g
          key={i}
          transform={`translate(${b.x}, ${b.y}) scale(${b.scale})`}
          style={{
            willChange: "transform",
            animation: `birdFly ${b.dur}s ${b.delay}s linear infinite`,
          }}
        >
          <path
            d="M0,0 Q5,-4 10,0 Q15,-4 20,0"
            fill="none"
            stroke="#334155"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      ))}
    </>
  );
}

// ── Layer: Terrain scenes ─────────────────────────────────────

function RiverTerrain({ colors }: { colors: RegionColors }) {
  return (
    <g>
      {/* back hills */}
      <path d="M0,160 Q100,110 200,140 Q300,110 400,135 Q500,100 600,130 Q700,105 800,125 L800,220 L0,220 Z"
        fill={colors.groundSecondary} opacity="0.6" />
      <path d="M0,175 Q120,145 250,160 Q380,140 500,158 Q640,138 800,150 L800,220 L0,220 Z"
        fill={colors.groundPrimary} opacity="0.75" />
      {/* river strip */}
      <rect x="0" y="195" width="800" height="30" fill={colors.waterColor ?? "#5b9fcc"} opacity="0.85" />
      {/* fields */}
      {[0, 100, 200, 310, 420, 530, 640].map((x, i) => (
        <rect key={i} x={x} y="170" width="80" height="22"
          fill={i % 2 === 0 ? colors.groundPrimary : colors.groundSecondary}
          opacity="0.55" rx="2" />
      ))}
      {/* temple silhouette */}
      <g transform="translate(640, 130)" opacity="0.7">
        <rect x="0" y="20" width="40" height="30" fill={colors.accentDark} />
        <polygon points="20,0 0,20 40,20" fill={colors.accentDark} />
        <rect x="15" y="8" width="10" height="8" fill={colors.accentLight} opacity="0.5" />
      </g>
    </g>
  );
}

function CoastalTerrain({ colors }: { colors: RegionColors }) {
  const ocean = colors.waterColor ?? "#1E90B4";
  return (
    <g>
      {/* ocean */}
      <rect x="0" y="160" width="800" height="140" fill={ocean} opacity="0.85" />
      {/* beach */}
      <path d="M0,175 Q200,165 400,170 Q600,163 800,168 L800,195 L0,195 Z"
        fill="#E8D5A3" opacity="0.9" />
      {/* distant hills */}
      <path d="M0,155 Q150,120 300,145 Q450,115 600,140 Q700,120 800,138 L800,165 L0,165 Z"
        fill={colors.groundPrimary} opacity="0.55" />
      {/* lighthouse */}
      <g transform="translate(70, 110)" opacity="0.85">
        <rect x="8" y="10" width="14" height="40" fill="#f0f0f0" />
        <rect x="5" y="8" width="20" height="6" fill="#c0392b" />
        <rect x="11" y="2" width="8" height="8" fill="#ffe07a" opacity="0.9" />
        <rect x="0" y="45" width="30" height="8" fill="#aaa" />
      </g>
      {/* palm tree silhouettes */}
      {[650, 720].map((x, i) => (
        <g key={i} transform={`translate(${x}, 130)`} opacity="0.7">
          <rect x="6" y="0" width="8" height="45" fill="#8B6914" rx="2" />
          <ellipse cx="10" cy="-2" rx="22" ry="12" fill="#2d6a4f" />
          <path d="M10,-2 Q-12,-15 -20,-5" stroke="#2d6a4f" strokeWidth="4" fill="none" />
          <path d="M10,-2 Q30,-16 38,-8" stroke="#2d6a4f" strokeWidth="4" fill="none" />
        </g>
      ))}
    </g>
  );
}

function DesertTerrain({ colors }: { colors: RegionColors }) {
  return (
    <g>
      {/* dunes */}
      <path d="M0,200 Q80,155 200,185 Q300,155 420,185 Q540,150 680,180 Q740,165 800,175 L800,300 L0,300 Z"
        fill={colors.groundSecondary || "#D2956A"} opacity="0.9" />
      <path d="M0,215 Q100,190 200,205 Q320,180 460,205 Q580,185 700,200 L800,195 L800,300 L0,300 Z"
        fill={colors.groundPrimary || "#C4784A"} opacity="0.7" />
      {/* distant fort silhouette */}
      <g transform="translate(60, 120)" opacity="0.65">
        <rect x="0" y="30" width="120" height="55" fill="#6B3E26" />
        <rect x="-5" y="20" width="18" height="45" fill="#6B3E26" />
        <rect x="107" y="20" width="18" height="45" fill="#6B3E26" />
        <rect x="52" y="10" width="20" height="45" fill="#6B3E26" />
        <path d="M52,10 Q62,0 72,10" fill="#8B5E3C" />
        {/* battlements */}
        {[0, 15, 30, 45, 60, 75, 90, 105].map((bx, i) => (
          <rect key={i} x={bx} y="20" width="8" height="10" fill="#6B3E26" />
        ))}
        {/* arch */}
        <path d="M45,85 Q60,65 75,85" fill="none" stroke="#3E1F05" strokeWidth="3" />
      </g>
      {/* distant cactus */}
      {[500, 580, 660].map((x, i) => (
        <g key={i} transform={`translate(${x}, 160)`} opacity="0.6">
          <rect x="6" y="0" width="8" height="40" fill="#5a7a52" />
          <rect x="-8" y="10" width="14" height="6" fill="#5a7a52" />
          <rect x="20" y="15" width="14" height="6" fill="#5a7a52" />
        </g>
      ))}
    </g>
  );
}

function HillsTerrain({ colors }: { colors: RegionColors }) {
  const layerColors = [
    colors.groundSecondary,
    colors.groundPrimary,
    colors.accentDark,
  ];
  return (
    <g>
      <path d="M0,160 Q80,100 200,140 Q300,90 420,135 Q520,95 650,130 Q720,100 800,120 L800,220 L0,220 Z"
        fill={layerColors[0]} opacity="0.5" />
      <path d="M0,180 Q100,135 230,165 Q360,130 500,160 Q620,130 750,155 L800,152 L800,230 L0,230 Z"
        fill={layerColors[1]} opacity="0.65" />
      <path d="M0,200 Q120,170 260,190 Q390,160 530,185 Q660,165 800,178 L800,250 L0,250 Z"
        fill={layerColors[2]} opacity="0.5" />
      {/* tea garden strips */}
      {Array.from({ length: 8 }).map((_, i) => (
        <g key={i} transform={`translate(${i * 95 + 20}, 185)`}>
          {Array.from({ length: 4 }).map((_, j) => (
            <ellipse key={j} cx={j * 10} cy={j * 4} rx="6" ry="4"
              fill={colors.groundSecondary} opacity="0.7" />
          ))}
        </g>
      ))}
    </g>
  );
}

function MountainTerrain({ colors }: { colors: RegionColors }) {
  const peaks = [
    { x: 60, peakY: 60, baseW: 180 },
    { x: 200, peakY: 40, baseW: 220 },
    { x: 400, peakY: 50, baseW: 200 },
    { x: 580, peakY: 70, baseW: 170 },
    { x: 700, peakY: 85, baseW: 150 },
  ];
  return (
    <g>
      {/* back mountains */}
      {peaks.map((p, i) => (
        <g key={i} opacity="0.7">
          <polygon
            points={`${p.x},${p.peakY + 25} ${p.x + p.baseW / 2},${p.peakY} ${p.x + p.baseW},${p.peakY + 25} ${p.x + p.baseW},220 ${p.x},220`}
            fill={i % 2 === 0 ? colors.groundPrimary : colors.groundSecondary}
          />
          {/* snow cap */}
          <polygon
            points={`${p.x + p.baseW / 2},${p.peakY} ${p.x + p.baseW / 2 - 25},${p.peakY + 28} ${p.x + p.baseW / 2 + 25},${p.peakY + 28}`}
            fill="white"
            opacity="0.9"
          />
        </g>
      ))}
      {/* pine tree silhouettes */}
      {[120, 180, 340, 440, 540].map((x, i) => (
        <g key={i} transform={`translate(${x}, 185)`} opacity="0.8">
          <polygon points="10,0 0,25 20,25" fill="#1a3d2b" />
          <polygon points="10,15 -4,38 24,38" fill="#1a3d2b" />
          <rect x="7" y="38" width="6" height="12" fill="#5D4037" />
        </g>
      ))}
    </g>
  );
}

function PlainsTerrain({ colors }: { colors: RegionColors }) {
  const fieldColors = [colors.groundPrimary, colors.groundSecondary, "#7FB069", "#A8D5A2"];
  return (
    <g>
      {/* flat ground */}
      <rect x="0" y="185" width="800" height="115" fill={colors.groundPrimary} />
      {/* agricultural strips */}
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i}
          x={i * 80}
          y="170"
          width="78"
          height="45"
          fill={fieldColors[i % fieldColors.length]}
          opacity="0.65"
          rx="1"
        />
      ))}
      {/* distant windmill */}
      <g transform="translate(390, 130)" opacity="0.6">
        <rect x="9" y="0" width="8" height="55" fill="#999" />
        <circle cx="13" cy="8" r="3" fill="#888" />
        {[0, 90, 180, 270].map((angle, i) => (
          <line key={i}
            x1="13" y1="8"
            x2={13 + 18 * Math.cos((angle * Math.PI) / 180)}
            y2={8 + 18 * Math.sin((angle * Math.PI) / 180)}
            stroke="#aaa" strokeWidth="2.5" />
        ))}
      </g>
      {/* horizon line */}
      <path d="M0,170 Q400,163 800,167" stroke={colors.groundSecondary} strokeWidth="2" fill="none" opacity="0.4" />
    </g>
  );
}

function ForestTerrain({ colors }: { colors: RegionColors }) {
  const treeData = [
    { x: 0, y: 170, r: 38, fill: "#1a3d2b" },
    { x: 55, y: 155, r: 44, fill: "#2d6a4f" },
    { x: 120, y: 165, r: 36, fill: "#1b4332" },
    { x: 190, y: 150, r: 48, fill: "#2d6a4f" },
    { x: 265, y: 160, r: 40, fill: "#1a3d2b" },
    { x: 330, y: 148, r: 50, fill: "#40916c" },
    { x: 420, y: 158, r: 42, fill: "#1b4332" },
    { x: 490, y: 145, r: 52, fill: "#2d6a4f" },
    { x: 570, y: 155, r: 38, fill: "#1a3d2b" },
    { x: 640, y: 148, r: 46, fill: "#40916c" },
    { x: 710, y: 160, r: 40, fill: "#2d6a4f" },
    { x: 770, y: 150, r: 44, fill: "#1b4332" },
  ];
  return (
    <g>
      {/* back layer */}
      <path d="M0,175 Q200,145 400,160 Q600,140 800,155 L800,220 L0,220 Z"
        fill={colors.groundSecondary} opacity="0.4" />
      {/* tree canopies */}
      {treeData.map((t, i) => (
        <g key={i}>
          <rect x={t.x + t.r - 7} y={t.y + t.r - 10} width="14" height="30" fill="#5D4037" />
          <circle cx={t.x + t.r} cy={t.y} r={t.r} fill={t.fill} opacity="0.85" />
        </g>
      ))}
      {/* ground */}
      <rect x="0" y="210" width="800" height="90" fill={colors.groundPrimary} opacity="0.9" />
    </g>
  );
}

function IslandTerrain({ colors }: { colors: RegionColors }) {
  const water = colors.waterColor ?? "#0EA5E9";
  return (
    <g>
      {/* ocean */}
      <rect x="0" y="145" width="800" height="155" fill={water} opacity="0.9" />
      {/* island body */}
      <ellipse cx="400" cy="210" rx="180" ry="55" fill="#C9A84C" opacity="0.9" />
      <ellipse cx="400" cy="195" rx="150" ry="38" fill="#D4A853" opacity="0.85" />
      {/* vegetation strip */}
      <ellipse cx="400" cy="185" rx="130" ry="22" fill="#2d6a4f" opacity="0.75" />
      {/* palm trees */}
      {[310, 400, 490].map((x, i) => (
        <g key={i} transform={`translate(${x}, 155)`}>
          <rect x="4" y="0" width="8" height="38" fill="#8B6914" rx="2" />
          <path d="M8,-4 Q-15,-20 -22,-12" stroke="#2d6a4f" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M8,-4 Q28,-22 35,-14" stroke="#2d6a4f" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M8,-4 Q5,-28 10,-30" stroke="#2d6a4f" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="8" cy="-4" r="5" fill="#5a8c5e" />
        </g>
      ))}
      {/* distant small island */}
      <ellipse cx="680" cy="190" rx="55" ry="18" fill="#B8956A" opacity="0.6" />
    </g>
  );
}

function WetlandTerrain({ colors }: { colors: RegionColors }) {
  const water = colors.waterColor ?? "#4DB6AC";
  return (
    <g>
      {/* flat water */}
      <rect x="0" y="165" width="800" height="135" fill={water} opacity="0.75" />
      {/* mud banks */}
      <path d="M0,175 Q150,165 300,172 Q450,160 600,170 Q700,163 800,168 L800,200 L0,200 Z"
        fill={colors.groundPrimary} opacity="0.5" />
      {/* lotus shapes */}
      {[80, 200, 330, 460, 590, 700].map((x, i) => (
        <g key={i} transform={`translate(${x}, ${175 + (i % 2) * 15})`}>
          {/* petals */}
          {Array.from({ length: 6 }).map((_, p) => {
            const angle = (p * 60 * Math.PI) / 180;
            return (
              <ellipse key={p}
                cx={12 * Math.cos(angle)}
                cy={12 * Math.sin(angle)}
                rx="7" ry="4"
                fill="#f9a8d4"
                opacity="0.85"
                transform={`rotate(${p * 60}, ${12 * Math.cos(angle)}, ${12 * Math.sin(angle)})`}
              />
            );
          })}
          <circle cx="0" cy="0" r="6" fill="#FFD700" opacity="0.9" />
          {/* leaf */}
          <ellipse cx="-18" cy="6" rx="14" ry="7" fill="#2d6a4f" opacity="0.6" />
        </g>
      ))}
      {/* reed grasses */}
      {[40, 150, 260, 380, 490, 620, 740].map((x, i) => (
        <g key={i} transform={`translate(${x}, 155)`} opacity="0.75">
          <rect x="0" y="0" width="4" height="40" fill="#5D4037" rx="2" />
          <ellipse cx="2" cy="-2" rx="4" ry="10" fill="#795548" />
          <rect x="12" y="5" width="3" height="32" fill="#6D4C41" rx="1.5" />
          <ellipse cx="13.5" cy="3" rx="3" ry="8" fill="#795548" />
        </g>
      ))}
    </g>
  );
}

function UrbanTerrain({ colors }: { colors: RegionColors }) {
  const buildings = [
    { x: 10, h: 100, w: 55, windows: 4, special: "flat" },
    { x: 72, h: 130, w: 45, windows: 5, special: "dome" },
    { x: 124, h: 90, w: 50, windows: 3, special: "flat" },
    { x: 182, h: 155, w: 38, windows: 6, special: "spire" },
    { x: 228, h: 85, w: 55, windows: 3, special: "flat" },
    { x: 290, h: 110, w: 42, windows: 4, special: "flat" },
    { x: 340, h: 140, w: 50, windows: 5, special: "dome" },
    { x: 400, h: 95, w: 45, windows: 3, special: "flat" },
    { x: 453, h: 160, w: 42, windows: 6, special: "spire" },
    { x: 503, h: 100, w: 55, windows: 4, special: "flat" },
    { x: 566, h: 125, w: 40, windows: 5, special: "flat" },
    { x: 614, h: 90, w: 52, windows: 3, special: "dome" },
    { x: 674, h: 140, w: 38, windows: 5, special: "flat" },
    { x: 720, h: 110, w: 50, windows: 4, special: "spire" },
    { x: 778, h: 95, w: 45, windows: 3, special: "flat" },
  ];
  const buildingBase = 260;
  const wallColor = colors.accentDark;
  const windowColor = colors.accentLight;

  return (
    <g>
      {buildings.map((b, i) => {
        const top = buildingBase - b.h;
        return (
          <g key={i}>
            {/* building body */}
            <rect x={b.x} y={top} width={b.w} height={b.h}
              fill={i % 3 === 0 ? wallColor : i % 3 === 1 ? "#6B7280" : "#4B5563"}
              opacity="0.88" />
            {/* windows */}
            {Array.from({ length: b.windows }).map((_, wi) => (
              <rect key={wi}
                x={b.x + 6}
                y={top + 10 + wi * 20}
                width={b.w - 12}
                height="10"
                fill={windowColor}
                opacity="0.55"
                rx="1"
              />
            ))}
            {/* specials */}
            {b.special === "dome" && (
              <ellipse cx={b.x + b.w / 2} cy={top} rx={b.w / 2.2} ry={12}
                fill={colors.accentLight} opacity="0.7" />
            )}
            {b.special === "spire" && (
              <polygon
                points={`${b.x + b.w / 2},${top - 22} ${b.x + 4},${top} ${b.x + b.w - 4},${top}`}
                fill={wallColor} opacity="0.8" />
            )}
          </g>
        );
      })}
      {/* ground road */}
      <rect x="0" y="260" width="800" height="40" fill="#374151" opacity="0.9" />
      <rect x="0" y="278" width="800" height="4" fill="#F9FAFB" opacity="0.15" />
    </g>
  );
}

function TerrainLayer({
  config,
  colors,
}: {
  config: EnvironmentConfig;
  colors: RegionColors;
}) {
  switch (config.type) {
    case "river":
      return <RiverTerrain colors={colors} />;
    case "coastal":
      return <CoastalTerrain colors={colors} />;
    case "desert":
      return <DesertTerrain colors={colors} />;
    case "hills":
      return <HillsTerrain colors={colors} />;
    case "mountain":
      return <MountainTerrain colors={colors} />;
    case "plains":
      return <PlainsTerrain colors={colors} />;
    case "forest":
      return <ForestTerrain colors={colors} />;
    case "island":
      return <IslandTerrain colors={colors} />;
    case "wetland":
      return <WetlandTerrain colors={colors} />;
    case "urban":
      return <UrbanTerrain colors={colors} />;
    default:
      return <PlainsTerrain colors={colors} />;
  }
}

// ── Layer: Water waves ────────────────────────────────────────

function WaterWaveLayer({
  config,
  colors,
}: {
  config: EnvironmentConfig;
  colors: RegionColors;
}) {
  if (!colors.waterColor) return null;
  if (!["river", "coastal", "wetland", "island"].includes(config.type)) return null;

  const waveY = config.type === "river" ? 195 : config.type === "coastal" ? 170 : 168;

  return (
    <g opacity="0.55">
      {/* wave 1 */}
      <path
        d={`M0,${waveY} Q100,${waveY - 6} 200,${waveY} Q300,${waveY + 6} 400,${waveY} Q500,${waveY - 6} 600,${waveY} Q700,${waveY + 6} 800,${waveY}`}
        fill="none"
        stroke="white"
        strokeWidth="2"
        style={{ willChange: "transform", animation: "waveRoll 4s -0.5s ease-in-out infinite" }}
      />
      {/* wave 2 */}
      <path
        d={`M0,${waveY + 6} Q100,${waveY} 200,${waveY + 6} Q300,${waveY + 12} 400,${waveY + 6} Q500,${waveY} 600,${waveY + 6} Q700,${waveY + 12} 800,${waveY + 6}`}
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        style={{ willChange: "transform", animation: "waveRoll 5s -1.5s ease-in-out infinite" }}
      />
    </g>
  );
}

// ── Layer: Boat ───────────────────────────────────────────────

function BoatLayer({
  config,
  colors,
}: {
  config: EnvironmentConfig;
  colors: RegionColors;
}) {
  if (!hasLayer(config, "boat")) return null;

  const waterY = config.type === "river" ? 200 : config.type === "coastal" ? 175 : 175;

  return (
    <g
      style={{
        willChange: "transform",
        animation: "boatBob 3.5s ease-in-out infinite",
      }}
    >
      {/* hull */}
      <path
        d={`M200,${waterY - 8} L240,${waterY - 8} L248,${waterY + 2} L192,${waterY + 2} Z`}
        fill={colors.accentDark}
        opacity="0.9"
      />
      {/* mast */}
      <line x1="220" y1={waterY - 8} x2="220" y2={waterY - 40} stroke="#5D4037" strokeWidth="2" />
      {/* sail */}
      <polygon
        points={`220,${waterY - 38} 220,${waterY - 10} 242,${waterY - 18}`}
        fill="white"
        opacity="0.85"
      />
      {/* second boat offset */}
      <path
        d={`M500,${waterY - 6} L534,${waterY - 6} L542,${waterY + 2} L492,${waterY + 2} Z`}
        fill="#8B6914"
        opacity="0.75"
      />
      <line x1="517" y1={waterY - 6} x2="517" y2={waterY - 32} stroke="#5D4037" strokeWidth="2" />
      <polygon
        points={`517,${waterY - 30} 517,${waterY - 8} 536,${waterY - 15}`}
        fill="#FFE9B0"
        opacity="0.8"
      />
    </g>
  );
}

// ── Layer: Trees / vegetation (animated sway) ─────────────────

function TreeSwayLayer({ config, colors }: { config: EnvironmentConfig; colors: RegionColors }) {
  if (!hasLayer(config, "trees")) return null;

  const treePositions = [60, 160, 280, 580, 700];

  return (
    <>
      {treePositions.map((x, i) => (
        <g
          key={i}
          transform={`translate(${x}, 185)`}
          style={{
            willChange: "transform",
            transformOrigin: `${x + 10}px 215px`,
            animation: `treeSway ${2.5 + i * 0.4}s ${-i * 0.6}s ease-in-out infinite`,
          }}
        >
          <rect x="6" y="20" width="10" height="28" fill="#5D4037" rx="2" />
          <circle cx="11" cy="12" r="18" fill={colors.groundSecondary} opacity="0.85" />
          <circle cx="11" cy="8" r="12" fill={colors.groundPrimary} opacity="0.75" />
        </g>
      ))}
    </>
  );
}

// ── Layer: Foreground ground strip ────────────────────────────

function ForegroundLayer({ config, colors }: { config: EnvironmentConfig; colors: RegionColors }) {
  const isMountain = config.type === "mountain";
  const isUrban = config.type === "urban";
  if (isUrban) return null; // urban draws its own ground

  return (
    <g>
      {isMountain ? (
        <path
          d="M0,265 Q200,255 400,260 Q600,255 800,260 L800,300 L0,300 Z"
          fill={colors.groundPrimary}
          opacity="0.95"
        />
      ) : (
        <>
          <path
            d="M0,268 Q200,260 400,265 Q600,260 800,265 L800,300 L0,300 Z"
            fill={colors.groundSecondary}
            opacity="0.7"
          />
          <path
            d="M0,275 Q200,268 400,272 Q600,268 800,272 L800,300 L0,300 Z"
            fill={colors.groundPrimary}
            opacity="0.9"
          />
        </>
      )}
    </g>
  );
}

// ── Keyframe styles ───────────────────────────────────────────

const KEYFRAMES = `
  @keyframes cloudDrift {
    from { transform: translateX(0px); }
    to   { transform: translateX(950px); }
  }
  @keyframes birdFly {
    from { transform: translateX(0px) translateY(0px); }
    25%  { transform: translateX(220px) translateY(-12px); }
    50%  { transform: translateX(440px) translateY(0px); }
    75%  { transform: translateX(660px) translateY(-8px); }
    to   { transform: translateX(900px) translateY(0px); }
  }
  @keyframes waveRoll {
    0%   { transform: translateX(0px); }
    50%  { transform: translateX(30px); }
    100% { transform: translateX(0px); }
  }
  @keyframes boatBob {
    0%   { transform: translateY(0px) rotate(0deg); }
    25%  { transform: translateY(-4px) rotate(0.6deg); }
    75%  { transform: translateY(3px) rotate(-0.5deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  @keyframes treeSway {
    0%   { transform: rotate(0deg); }
    30%  { transform: rotate(1.5deg); }
    70%  { transform: rotate(-1.5deg); }
    100% { transform: rotate(0deg); }
  }
`;

// ── Main export ───────────────────────────────────────────────

export function AnimatedLandscape({ config, colors }: Props) {
  // Unique prefix so multiple instances don't share gradient IDs
  const id = `env-${config.type}-${config.timeOfDay}`;

  return (
    <svg
      viewBox="0 0 800 300"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-label={`${config.type} landscape scene`}
      role="img"
    >
      {/* embedded keyframes */}
      <style>{KEYFRAMES}</style>

      {/* Layer 1 — Sky */}
      <SkyLayer id={id} colors={colors} />

      {/* Layer 2 — Sun / Moon */}
      <SunMoonLayer timeOfDay={config.timeOfDay} />

      {/* Layer 3 — Clouds */}
      <CloudLayer config={config} />

      {/* Layer 4 — Birds */}
      <BirdsLayer config={config} />

      {/* Layer 5 — Terrain */}
      <TerrainLayer config={config} colors={colors} />

      {/* Layer 6 — Water waves */}
      <WaterWaveLayer config={config} colors={colors} />

      {/* Layer 7 — Boat */}
      <BoatLayer config={config} colors={colors} />

      {/* Layer 8 — Animated trees */}
      <TreeSwayLayer config={config} colors={colors} />

      {/* Layer 9 — Foreground ground */}
      <ForegroundLayer config={config} colors={colors} />
    </svg>
  );
}

export default AnimatedLandscape;
