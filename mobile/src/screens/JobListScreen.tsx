import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Job } from "../types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  payment_pending: "Payment pending",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

export default function JobListScreen({ navigation }: { navigation: any }) {
  const { user, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchJobs() {
    if (!user) return;
    const { data, error } = await supabase
      .from("jobs")
      .select("id, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setJobs((data ?? []) as Job[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchJobs();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        <TouchableOpacity style={styles.signOut} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No jobs yet</Text>
            <Text style={styles.emptySub}>Create a job and add photos to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}
          >
            <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            <Text style={styles.cardStatus}>{STATUS_LABELS[item.status] ?? item.status}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateJob")}
      >
        <Text style={styles.fabText}>+ New job</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  signOut: {},
  signOutText: { color: "#64748b", fontSize: 14 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { fontSize: 18, color: "#64748b" },
  emptySub: { fontSize: 14, color: "#94a3b8", marginTop: 8 },
  card: { backgroundColor: "#fff", marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 8 },
  cardDate: { fontSize: 16, color: "#0f172a" },
  cardStatus: { fontSize: 14, color: "#64748b", marginTop: 4 },
  fab: { position: "absolute", bottom: 24, right: 24, backgroundColor: "#0f172a", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 8 },
  fabText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
