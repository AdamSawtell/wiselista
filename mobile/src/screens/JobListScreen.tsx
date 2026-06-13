import React, { useCallback, useEffect, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import type { Job } from "../types";
import StatusBadge from "../components/StatusBadge";
import PrimaryButton from "../components/PrimaryButton";

function jobTitle(job: Job): string {
  if (job.name?.trim()) return job.name.trim();
  return `Property shoot · ${new Date(job.created_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
}

export default function JobListScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchJobs() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, status, created_at, updated_at, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setJobs((data ?? []) as Job[]);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchJobs();
    }, [user?.id])
  );

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
        <Text style={[styles.brand, { color: theme.colors.primary }]}>wiselista</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Your shoots</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={jobs.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchJobs();
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No shoots yet</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
              Start a guided property shoot. We enhance every photo for your listing.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.row,
              { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight },
              index === 0 && styles.rowFirst,
            ]}
            onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {jobTitle(item)}
              </Text>
              <View style={styles.rowMeta}>
                <StatusBadge status={item.status} />
                <Text style={[styles.rowDate, { color: theme.colors.textMuted }]}>
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        )}
      />

      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <PrimaryButton label="Shoot property" onPress={() => navigation.navigate("ShootStart")} style={styles.mainCta} />
        {jobs.length > 0 && (
          <PrimaryButton
            label="Quick job"
            onPress={() => navigation.navigate("CreateJob")}
            variant="ghost"
            style={styles.secondaryCta}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
  },
  brand: { ...theme.typography.label, marginBottom: theme.spacing.xs },
  title: { ...theme.typography.titleLarge },
  list: { paddingBottom: 120 },
  emptyList: { flexGrow: 1, paddingBottom: 120 },
  empty: { padding: theme.spacing.xl, paddingTop: 48 },
  emptyTitle: { ...theme.typography.titleSmall, marginBottom: theme.spacing.sm },
  emptySub: { ...theme.typography.body },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
  },
  rowFirst: { marginTop: theme.spacing.sm },
  rowMain: { flex: 1, paddingRight: theme.spacing.sm },
  rowTitle: { ...theme.typography.bodyMedium, marginBottom: 6 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  rowDate: { ...theme.typography.caption },
  chevron: { fontSize: 24, fontWeight: "300", lineHeight: 24 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
  },
  mainCta: { width: "100%" },
  secondaryCta: { marginTop: 2 },
});
