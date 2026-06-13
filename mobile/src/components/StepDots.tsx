import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View
            key={i}
            style={[
              styles.segment,
              (done || active) && { backgroundColor: theme.colors.primary },
              !done && !active && { backgroundColor: theme.colors.border },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4, marginBottom: theme.spacing.lg },
  segment: { flex: 1, height: 3, borderRadius: 1 },
});
