// constants/theme.ts

export const COLORS = {
  primary: "#2E78FF",
  primaryDark: "#1F5FE0",
  bg: "#EAF2FF",
  card: "#FFFFFF",
  line: "rgba(0,0,0,0.08)",
  text: "#111827",
  subText: "rgba(17,24,39,0.65)",
  mutedText: "rgba(17,24,39,0.45)",
  danger: "#EF4444",
  success: "#22C55E",
  warning: "#F59E0B",

  // (코드에서 쓰는 키 맞추기)
  bgTop: "#EAF2FF",
  bgBottom: "#EAF2FF",
  sub: "rgba(17,24,39,0.65)",
} as const;

export const RADIUS = {
  card: 18,
  input: 12,
  pill: 999,

  // (코드에서 쓰는 키 맞추기)
  xl: 18,
} as const;

export const SPACING = {
  page: 14,
  section: 16,
  item: 12,

  // (코드에서 쓰는 키 맞추기)
  card: 14,
} as const;

export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  floating: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  // (코드에서 쓰는 키 맞추기)
  soft: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

// ✅ 소문자 alias (기존 import { colors, radius, shadow, spacing } 대응)
export const colors = COLORS;
export const radius = RADIUS;
export const spacing = SPACING;
export const shadow = SHADOW;
