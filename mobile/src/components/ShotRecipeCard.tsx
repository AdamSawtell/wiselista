import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";
import type { ShotRecipe } from "../lib/shotRecipes";

export default function ShotRecipeCard({ recipe }: { recipe: ShotRecipe }) {
  const rows: Array<[string, string]> = [
    ["Stance", recipe.stance],
    ["Lens", recipe.lensLabel],
    ["Height", recipe.height],
    ["Include", recipe.include],
    ["Hide", recipe.hide],
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Shot recipe</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
          <Text style={[styles.value, { color: theme.colors.textSecondary }]}>{value}</Text>
        </View>
      ))}
      {recipe.orientation === "landscape" ? (
        <Text style={[styles.landscape, { color: theme.colors.warning }]}>
          Rotate the phone sideways (landscape) for this shot.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.captionMedium,
    marginBottom: theme.spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: { marginBottom: theme.spacing.sm },
  label: { ...theme.typography.label, marginBottom: 2 },
  value: { ...theme.typography.body },
  landscape: { ...theme.typography.captionMedium, marginTop: theme.spacing.sm },
});
