import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

type Props = {
  rollDegrees: number;
  tiltHint: string | null;
  isLevel: boolean;
  sensorsAvailable: boolean;
};

export default function CaptureCoachingOverlay({
  rollDegrees,
  tiltHint,
  isLevel,
  sensorsAvailable,
}: Props) {
  if (!sensorsAvailable) return null;

  return (
    <>
      <View style={styles.hintBar}>
        <View style={[styles.hintPill, isLevel ? styles.hintOk : styles.hintWarn]}>
          <Text style={[styles.hintText, !isLevel && styles.hintTextOnRed]}>
            {isLevel ? "Level" : tiltHint}
          </Text>
        </View>
      </View>
      <View
        style={[styles.levelWrap, { transform: [{ rotate: `${rollDegrees}deg` }] }]}
        pointerEvents="none"
      >
        <View style={[styles.levelLine, isLevel ? styles.levelLineOk : styles.levelLineWarn]} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hintBar: {
    position: "absolute",
    top: theme.spacing.lg,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  hintPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
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
