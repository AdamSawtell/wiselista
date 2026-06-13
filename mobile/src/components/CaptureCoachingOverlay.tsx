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
          <Text style={styles.hintText}>{isLevel ? "Phone level" : tiltHint}</Text>
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
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  hintOk: { backgroundColor: "rgba(34, 197, 94, 0.9)" },
  hintWarn: { backgroundColor: "rgba(234, 179, 8, 0.95)" },
  hintText: {
    color: "#fff",
    ...theme.typography.captionMedium,
    textAlign: "center",
  },
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
  levelLineOk: { backgroundColor: "rgba(34, 197, 94, 0.85)" },
  levelLineWarn: { backgroundColor: "rgba(234, 179, 8, 0.9)" },
});
