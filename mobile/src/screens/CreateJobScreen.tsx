import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import PrimaryButton from "../components/PrimaryButton";
import { PLANS, type PlanTier } from "../lib/plans";

export default function CreateJobScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [planTier, setPlanTier] = useState<PlanTier>("core");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("jobs")
      .insert({ user_id: user.id, status: "draft", plan_tier: planTier })
      .select("id")
      .single();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data) navigation.replace("JobDetail", { jobId: data.id });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryMuted }]}>
          <Ionicons name="folder-open-outline" size={36} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Quick job</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Create a blank property job and add photos manually — useful when you already have images on your phone.
        </Text>

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
                ${PLANS[tier].priceAud} AUD
              </Text>
            </Pressable>
          ))}
        </View>

        {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}
        <PrimaryButton label="Create job" onPress={handleCreate} loading={loading} style={styles.cta} />
        <PrimaryButton label="Cancel" onPress={() => navigation.goBack()} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    justifyContent: "center",
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
    alignSelf: "center",
  },
  title: { ...theme.typography.titleLarge, textAlign: "center", marginBottom: theme.spacing.sm },
  subtitle: { ...theme.typography.body, textAlign: "center", marginBottom: theme.spacing.xl },
  label: { ...theme.typography.captionMedium, marginBottom: theme.spacing.sm, textAlign: "center" },
  planRow: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg, width: "100%" },
  planChip: { borderWidth: 1, borderRadius: theme.radius.sm, padding: theme.spacing.md },
  planTitle: { ...theme.typography.captionMedium, textAlign: "center" },
  planPrice: { ...theme.typography.caption, marginTop: 4, textAlign: "center" },
  error: { ...theme.typography.caption, textAlign: "center", marginBottom: theme.spacing.md },
  cta: { marginBottom: theme.spacing.xs },
});
