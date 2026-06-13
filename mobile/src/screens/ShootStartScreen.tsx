import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Pressable,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { PLANS, type PlanTier } from "../lib/plans";

const STEPS = [
  "Walk through each room with pro framing tips",
  "Capture photos on site with your phone",
  "Submit for AI enhancement — ready in ~20 seconds per photo",
];

export default function ShootStartScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [propertyName, setPropertyName] = useState("");
  const [planTier, setPlanTier] = useState<PlanTier>("core");
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
        plan_tier: planTier,
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
        <Text style={[styles.brand, { color: theme.colors.primary }]}>Guided shoot</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Shoot this property</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Room-by-room guidance for listing-ready photos.
        </Text>

        <View style={[styles.stepsBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {STEPS.map((step, i) => (
            <View key={step} style={[styles.stepRow, i < STEPS.length - 1 && { borderBottomColor: theme.colors.borderLight, borderBottomWidth: 1 }]}>
              <Text style={[styles.stepNum, { color: theme.colors.primary }]}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={[styles.stepText, { color: theme.colors.textPrimary }]}>{step}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Property address or name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          placeholder="12 Oak Street"
          placeholderTextColor={theme.colors.textMuted}
          value={propertyName}
          onChangeText={setPropertyName}
          maxLength={120}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Choose a plan</Text>
        <View style={styles.planRow}>
          {(["core", "pro"] as const).map((tier) => (
            <Pressable
              key={tier}
              onPress={() => setPlanTier(tier)}
              style={[
                styles.planChip,
                {
                  borderColor: planTier === tier ? theme.colors.primary : theme.colors.border,
                  backgroundColor: planTier === tier ? "#EFF6FF" : theme.colors.surface,
                },
              ]}
            >
              <Text style={[styles.planTitle, { color: theme.colors.textPrimary }]}>{PLANS[tier].name}</Text>
              <Text style={[styles.planPrice, { color: theme.colors.textSecondary }]}>
                ${PLANS[tier].priceAud} AUD · {PLANS[tier].maxPhotos} photos
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.planHint, { color: theme.colors.textMuted }]}>
          Upgrade to Pro anytime before you submit.
        </Text>

        {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
        ) : (
          <>
            <PrimaryButton label="Start shoot" onPress={startGuidedShoot} style={styles.cta} />
            <PrimaryButton
              label="Quick job without guide"
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
  scroll: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
  },
  brand: { ...theme.typography.label, marginBottom: theme.spacing.sm },
  title: { ...theme.typography.titleLarge, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body, marginBottom: theme.spacing.xl },
  stepsBox: { borderWidth: 1, borderRadius: theme.radius.sm, marginBottom: theme.spacing.xl },
  stepRow: { flexDirection: "row", gap: theme.spacing.md, padding: theme.spacing.md },
  stepNum: { ...theme.typography.label, width: 28 },
  stepText: { ...theme.typography.body, flex: 1 },
  label: { ...theme.typography.captionMedium, marginBottom: theme.spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: 14,
    marginBottom: theme.spacing.lg,
    ...theme.typography.body,
  },
  error: { ...theme.typography.caption, marginBottom: theme.spacing.md },
  planRow: { gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  planChip: { borderWidth: 1, borderRadius: theme.radius.sm, padding: theme.spacing.md },
  planTitle: { ...theme.typography.captionMedium },
  planPrice: { ...theme.typography.caption, marginTop: 4 },
  planHint: { ...theme.typography.caption, marginBottom: theme.spacing.lg },
  loader: { marginVertical: theme.spacing.lg },
  cta: { marginBottom: theme.spacing.sm },
});
