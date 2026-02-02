import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

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
    <View style={styles.container}>
      <Text style={styles.title}>New job</Text>
      <Text style={styles.subtitle}>Start a new property photo set. You can add photos next.</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create job</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748b", marginBottom: 24 },
  error: { color: "#dc2626", marginBottom: 12 },
  button: { backgroundColor: "#0f172a", padding: 16, borderRadius: 8, alignItems: "center" },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancel: { marginTop: 16, alignItems: "center" },
  cancelText: { color: "#64748b", fontSize: 14 },
});
