/**
 * Wiselista mobile theme — clean, modern, property/real estate inspired.
 * Fits rental managers, agents, homeowners (product brief).
 */
import { Platform } from "react-native";

export const theme = {
  colors: {
    // Primary: deep teal/slate — trustworthy, listings, property
    primary: "#0f4c5c",
    primaryLight: "#0d9488",
    // Backgrounds
    background: "#f8fafc",
    backgroundWarm: "#fafaf9",
    surface: "#ffffff",
    surfaceMuted: "#f1f5f9",
    // Text
    textPrimary: "#1e293b",
    textSecondary: "#475569",
    textMuted: "#64748b",
    textOnPrimary: "#ffffff",
    // Borders & dividers
    border: "#e2e8f0",
    borderLight: "#f1f5f9",
    // Semantic
    success: "#059669",
    error: "#dc2626",
    warning: "#d97706",
    // Camera overlay (dark)
    cameraBar: "#0f4c5c",
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
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
};

export type Theme = typeof theme;
