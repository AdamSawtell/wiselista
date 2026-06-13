import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import PrimaryButton from "../components/PrimaryButton";

const FEATURES = [
  { icon: "🏠", text: "Room-by-room walkthrough" },
  { icon: "💡", text: "Pro framing tips as you shoot" },
  { icon: "✨", text: "AI enhancement when you submit" },
];

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={styles.heroEmoji}>📸</Text>
          <Text style={[styles.kicker, { color: theme.colors.primaryLight }]}>Guided shoot</Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Shoot this property</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Like having a photographer in your pocket — we coach you through every room.
          </Text>
        </View>

        {FEATURES.map((f) => (
          <View key={f.text} style={[styles.featureRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={[styles.featureText, { color: theme.colors.textPrimary }]}>{f.text}</Text>
          </View>
        ))}

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Property name (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          placeholder="e.g. 12 Oak Street"
          placeholderTextColor={theme.colors.textMuted}
          value={propertyName}
          onChangeText={setPropertyName}
          maxLength={120}
        />

        {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
        ) : (
          <>
            <PrimaryButton label="Start guided shoot" onPress={startGuidedShoot} style={styles.cta} />
            <PrimaryButton
              label="Quick capture (no guide)"
              onPress={() => navigation.navigate("CreateJob")}
              variant="secondary"
            />
            <PrimaryButton label="Cancel" onPress={() => navigation.goBack()} variant="ghost" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl, maxWidth: 440, alignSelf: "center", width: "100%" },
  heroCard: {
    alignItems: "center",
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  heroEmoji: { fontSize: 48, marginBottom: theme.spacing.sm },
  kicker: { ...theme.typography.label, letterSpacing: 1, textTransform: "uppercase", marginBottom: theme.spacing.xs },
  title: { ...theme.typography.title, marginBottom: theme.spacing.sm, textAlign: "center" },
  subtitle: { ...theme.typography.body, textAlign: "center" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  featureIcon: { fontSize: 22 },
  featureText: { ...theme.typography.bodyMedium, flex: 1 },
  label: { ...theme.typography.caption, marginBottom: theme.spacing.xs, marginTop: theme.spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.typography.body,
  },
  error: { ...theme.typography.caption, marginBottom: theme.spacing.md },
  loader: { marginVertical: theme.spacing.lg },
  cta: { marginBottom: theme.spacing.sm },
});
