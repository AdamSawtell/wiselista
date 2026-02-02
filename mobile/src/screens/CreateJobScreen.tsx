import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>New property job</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Start a new photo set for a property. You can add photos next.
        </Text>
        {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Create job</Text>
          )}
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
  inner: { flex: 1, padding: theme.spacing.xl, justifyContent: "center", maxWidth: 400, alignSelf: "center", width: "100%" },
  title: { ...theme.typography.title, marginBottom: theme.spacing.sm },
  subtitle: { ...theme.typography.body, marginBottom: theme.spacing.xl },
  error: { ...theme.typography.caption, marginBottom: theme.spacing.md },
  button: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
  cancel: { marginTop: theme.spacing.md, alignItems: "center" },
  cancelText: { ...theme.typography.captionMedium },
});
