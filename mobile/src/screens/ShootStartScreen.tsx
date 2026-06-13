import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";

export default function ShootStartScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [propertyName, setPropertyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGuidedShoot() {
    if (!user) return;
    setLoading(true);
    setError(null);
    const trimmed = propertyName.trim();
    const { data, error: err } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        status: "draft",
        name: trimmed || null,
      })
      .select("id")
      .single();
    setLoading(false);
    if (err || !data) {
      setError(err?.message ?? "Could not create project");
      return;
    }
    navigation.replace("GuidedShoot", {
      jobId: data.id,
      propertyName: trimmed || undefined,
      stepIndex: 0,
    });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.inner}>
        <Text style={[styles.kicker, { color: theme.colors.primary }]}>Guided shoot</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Shoot this property</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          We&apos;ll walk you room by room with framing tips — like having a photographer in your pocket.
        </Text>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Property name (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          placeholder="e.g. 12 Oak Street listing"
          placeholderTextColor={theme.colors.textMuted}
          value={propertyName}
          onChangeText={setPropertyName}
          maxLength={120}
        />

        {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={startGuidedShoot}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>Start guided shoot</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate("CreateJob")}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>
            Quick capture (no guide)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelText, { color: theme.colors.textMuted }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: "center",
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  kicker: { ...theme.typography.label, marginBottom: theme.spacing.sm, textTransform: "uppercase" },
  title: { ...theme.typography.title, marginBottom: theme.spacing.sm },
  subtitle: { ...theme.typography.body, marginBottom: theme.spacing.xl },
  label: { ...theme.typography.caption, marginBottom: theme.spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.typography.body,
  },
  error: { ...theme.typography.caption, marginBottom: theme.spacing.md },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
  secondaryBtn: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  secondaryBtnText: { ...theme.typography.bodyMedium },
  cancel: { alignItems: "center" },
  cancelText: { ...theme.typography.captionMedium },
});
