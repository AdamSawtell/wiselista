import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
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
  const { user } = useAuth();
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
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Property jobs</Text>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={jobs.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No jobs yet</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
              Create a job and add photos to get started
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.surface }, theme.shadow]}
            onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}
            activeOpacity={0.8}
          >
            <Text style={[styles.cardDate, { color: theme.colors.textPrimary }]}>
              {new Date(item.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
            <Text style={[styles.cardStatus, { color: theme.colors.textMuted }]}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("CreateJob")}
        activeOpacity={0.9}
      >
        <Text style={styles.fabText}>+ New job</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...theme.typography.title },
  list: { padding: theme.spacing.md, paddingBottom: 100 },
  emptyList: { flex: 1, padding: theme.spacing.md },
  empty: { padding: theme.spacing.xxl, alignItems: "center" },
  emptyText: { ...theme.typography.titleSmall, marginBottom: theme.spacing.sm },
  emptySub: { ...theme.typography.caption, textAlign: "center" },
  card: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  cardDate: { ...theme.typography.bodyMedium },
  cardStatus: { ...theme.typography.caption, marginTop: theme.spacing.xs },
  fab: {
    position: "absolute",
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  fabText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
});
