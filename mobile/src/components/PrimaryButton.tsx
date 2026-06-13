import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../theme";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  style?: ViewStyle;
};

export default function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
}: Props) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isOutline = variant === "outline";

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isOutline && styles.outline,
        variant === "ghost" && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.88}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.colors.textOnPrimary : theme.colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.textPrimary,
            (isSecondary || isOutline) && styles.textSecondary,
            variant === "ghost" && styles.textGhost,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.5 },
  text: { ...theme.typography.bodyMedium, fontSize: 15 },
  textPrimary: { color: theme.colors.textOnPrimary },
  textSecondary: { color: theme.colors.textPrimary },
  textGhost: { color: theme.colors.textMuted, fontWeight: "500" },
});
