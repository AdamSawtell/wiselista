import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";
import type { LiveCoach } from "../lib/captureCoaching";

type Props = {
  rollDegrees: number;
  coach: LiveCoach;
  sensorsAvailable: boolean;
};

export default function CaptureCoachingOverlay({ rollDegrees, coach, sensorsAvailable }: Props) {
  const warn = coach.kind !== "ok";

  return (
    <>
      <View style={styles.hintBar}>
        <View style={[styles.hintPill, warn ? styles.hintWarn : styles.hintOk]}>
          <Text style={[styles.hintText, warn && styles.hintTextOnRed]} numberOfLines={2}>
            {coach.kind === "ok" && sensorsAvailable ? `Level · ${coach.message}` : coach.message}
          </Text>
        </View>
      </View>
      {sensorsAvailable && coach.showLevelLine ? (
        <View
          style={[styles.levelWrap, { transform: [{ rotate: `${rollDegrees}deg` }] }]}
          pointerEvents="none"
        >
          <View style={[styles.levelLine, warn ? styles.levelLineWarn : styles.levelLineOk]} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  hintBar: {
    position: "absolute",
    top: theme.spacing.lg,
    left: theme.spacing.md,
    right: theme.spacing.md,
    alignItems: "center",
    zIndex: 2,
  },
  hintPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    maxWidth: "100%",
  },
  hintOk: { backgroundColor: "rgba(255,255,255,0.92)" },
  hintWarn: { backgroundColor: theme.colors.primary },
  hintText: {
    color: theme.colors.textPrimary,
    ...theme.typography.captionMedium,
    textAlign: "center",
  },
  hintTextOnRed: { color: theme.colors.textOnPrimary },
  levelWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  levelLine: {
    width: "72%",
    height: 2,
    borderRadius: 1,
  },
  levelLineOk: { backgroundColor: "rgba(255,255,255,0.9)" },
  levelLineWarn: { backgroundColor: theme.colors.primaryLight },
});
