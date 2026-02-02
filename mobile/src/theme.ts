/**
 * Wiselista mobile theme — dark, modern, property/real estate inspired.
 * Matches dark UI examples: dark navy background, bright accent, bottom nav.
 */
import { Platform } from "react-native";

export const theme = {
  colors: {
    // Dark background (navy/black like property search examples)
    background: "#0f172a",
    backgroundElevated: "#1e293b",
    surface: "#1e293b",
    surfaceMuted: "#334155",
    // Bright accent (blue — primary CTA, active state)
    primary: "#3b82f6",
    primaryLight: "#60a5fa",
    // Text on dark
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    textOnPrimary: "#ffffff",
    // Borders
    border: "#334155",
    borderLight: "#475569",
    // Semantic
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
    // Camera bar (dark)
    cameraBar: "#0f172a",
    cameraBarText: "#f8fafc",
    cameraBarMuted: "#94a3b8",
  },
  typography: {
    titleLarge: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
    title: { fontSize: 22, fontWeight: "600" as const },
    titleSmall: { fontSize: 18, fontWeight: "600" as const },
    body: { fontSize: 16, fontWeight: "400" as const },
    bodyMedium: { fontSize: 16, fontWeight: "500" as const },
    caption: { fontSize: 14, fontWeight: "400" as const },
    captionMedium: { fontSize: 14, fontWeight: "500" as const },
    label: { fontSize: 12, fontWeight: "500" as const },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  }),
};

export type Theme = typeof theme;
