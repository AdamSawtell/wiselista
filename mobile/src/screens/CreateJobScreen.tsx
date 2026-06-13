import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import PrimaryButton from "../components/PrimaryButton";

export default function CreateJobScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("jobs")
      .insert({ user_id: user.id, status: "draft" })
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
  error: { ...theme.typography.caption, textAlign: "center", marginBottom: theme.spacing.md },
  cta: { marginBottom: theme.spacing.xs },
});
