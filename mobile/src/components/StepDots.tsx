import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function StepDots({
  total,
  current,
  accent = theme.colors.primary,
}: {
  total: number;
  current: number;
  accent?: string;
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              done && { backgroundColor: accent, opacity: 0.85 },
              active && [styles.dotActive, { backgroundColor: accent }],
              !done && !active && { backgroundColor: theme.colors.surfaceMuted },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: theme.spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24, borderRadius: 4 },
});
