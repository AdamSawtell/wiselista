/**
 * Wiselista mobile — light, sharp real-estate UI (realestate.com inspired).
 * White surfaces, neutral greys, brand red for actions only.
 */
import { Platform } from "react-native";

export const theme = {
  colors: {
    background: "#F4F4F4",
    backgroundElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceMuted: "#EBEBEB",
    primary: "#E4002B",
    primaryDark: "#C40024",
    primaryLight: "#FF1A47",
    primaryMuted: "#FFF0F3",
    accent: "#E4002B",
    textPrimary: "#1A1A1A",
    textSecondary: "#525252",
    textMuted: "#737373",
    textOnPrimary: "#FFFFFF",
    border: "#E0E0E0",
    borderLight: "#EEEEEE",
    success: "#1B7F4B",
    successMuted: "#E8F5EE",
    error: "#C40024",
    errorMuted: "#FFF0F3",
    warning: "#B45309",
    cameraBar: "#0A0A0A",
    cameraBarText: "#FFFFFF",
    cameraBarMuted: "#A3A3A3",
  },
  typography: {
    titleLarge: { fontSize: 26, fontWeight: "700" as const, letterSpacing: -0.8 },
    title: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.4 },
    titleSmall: { fontSize: 17, fontWeight: "700" as const, letterSpacing: -0.2 },
    body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
    bodyMedium: { fontSize: 15, fontWeight: "600" as const, lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
    captionMedium: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
    label: {
      fontSize: 11,
      fontWeight: "700" as const,
      letterSpacing: 1.4,
      textTransform: "uppercase" as const,
    },
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
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
    full: 9999,
  },
  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: {},
  }),
};

export type Theme = typeof theme;
