// ============================================================
// DocSaathi AI — Regional Theme Type Definitions
// ============================================================

export type RegionType = "state" | "ut";

export type EnvironmentType =
  | "river"
  | "coastal"
  | "desert"
  | "hills"
  | "plains"
  | "forest"
  | "urban"
  | "mountain"
  | "island"
  | "wetland";

export type TimeOfDay = "sunrise" | "day" | "sunset" | "dusk";

export type ElementKind =
  | "mountain"
  | "hill"
  | "tree"
  | "palmTree"
  | "cactus"
  | "building"
  | "temple"
  | "fort"
  | "lighthouse"
  | "boat"
  | "houseboat"
  | "field"
  | "teaGarden"
  | "sand"
  | "cloud"
  | "bird"
  | "sun"
  | "moon"
  | "wave"
  | "lotus"
  | "windmill"
  | "minaret"
  | "pagoda"
  | "church"
  | "snowcap";

export type ElementPosition = "left" | "center" | "right" | "spread";

export type AnimatedLayerType =
  | "clouds"
  | "birds"
  | "water"
  | "boat"
  | "trees"
  | "sun"
  | "particles"
  | "leaves"
  | "snow";

export type AnimationSpeed = "slow" | "medium" | "fast";

export type AssistantState =
  | "welcome"
  | "listening"
  | "thinking"
  | "speaking"
  | "idle";

// ─────────────────────────────────────────────
// Sub-interfaces
// ─────────────────────────────────────────────

export interface RegionColors {
  /** Top of sky gradient */
  skyTop: string;
  /** Horizon / bottom of sky gradient */
  skyBottom: string;
  /** Primary ground / terrain color */
  groundPrimary: string;
  /** Secondary ground highlight */
  groundSecondary: string;
  /** Water body color (optional) */
  waterColor?: string;
  /** Light accent — card borders, highlights */
  accentLight: string;
  /** Dark accent — buttons, strong highlights */
  accentDark: string;
}

export interface EnvironmentElement {
  kind: ElementKind;
  count?: number;
  position?: ElementPosition;
  /** Optional override color */
  color?: string;
}

export interface AnimatedLayer {
  type: AnimatedLayerType;
  speed?: AnimationSpeed;
  count?: number;
}

export interface EnvironmentConfig {
  type: EnvironmentType;
  timeOfDay: TimeOfDay;
  elements: EnvironmentElement[];
  animatedLayers: AnimatedLayer[];
}

export interface CharacterConfig {
  /** Regional head/neck accessory e.g. "pagdi", "dhoti", "gamcha", "mundavalya" */
  accessory?: string;
  /** Regional prop e.g. "palm_leaf", "scroll", "lotus" */
  prop?: string;
}

// ─────────────────────────────────────────────
// Main Region Theme
// ─────────────────────────────────────────────

export interface RegionTheme {
  /** Slug identifier e.g. "bihar", "kerala" */
  id: string;
  /** Display name e.g. "Bihar" */
  name: string;
  /** Capital city name */
  capital: string;
  /** Whether this is a state or union territory */
  type: RegionType;
  /** Primary languages for voice/text suggestions */
  languages: string[];
  /** Hero greeting shown in the UI */
  welcomeMessage: string;
  /** Short environmental tagline */
  tagline: string;
  /** Full environment / scene configuration */
  environment: EnvironmentConfig;
  /** Color palette for this region's theme */
  colors: RegionColors;
  /** Character accessory/prop for the cartoon assistant */
  character: CharacterConfig;
  /** Representative emoji (flag/nature/landmark symbol) */
  emoji: string;
}
