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
  return `Shoot · ${new Date(job.created_at).toLocaleDateString(undefined, {
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
      <View style={styles.hero}>
        <Text style={[styles.kicker, { color: theme.colors.primaryLight }]}>Wiselista</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Your shoots</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Capture on site, we enhance for listing.
        </Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={jobs.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJobs(); }} colors={[theme.colors.primary]} />
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No property shoots yet</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
              Start a guided walkthrough — we&apos;ll coach you room by room.
            </Text>
            <PrimaryButton
              label="Shoot your first property"
              onPress={() => navigation.navigate("ShootStart")}
              style={styles.emptyCta}
            />
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}
            activeOpacity={0.85}
          >
            <View style={[styles.cardAccent, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {jobTitle(item)}
                </Text>
                <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>›</Text>
              </View>
              <View style={styles.cardMeta}>
                <StatusBadge status={item.status} />
                <Text style={[styles.cardDate, { color: theme.colors.textMuted }]}>
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {jobs.length > 0 && (
        <View style={styles.fabStack}>
          <TouchableOpacity
            style={[styles.fabSecondary, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate("CreateJob")}
            activeOpacity={0.8}
          >
            <Text style={[styles.fabSecondaryText, { color: theme.colors.textSecondary }]}>Quick job</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate("ShootStart")}
            activeOpacity={0.9}
          >
            <Text style={styles.fabText}>Shoot property</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  hero: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  kicker: { ...theme.typography.label, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  title: { ...theme.typography.titleLarge, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: 140 },
  emptyList: { flexGrow: 1, padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  emptyCard: {
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  emptyEmoji: { fontSize: 40, marginBottom: theme.spacing.md },
  emptyTitle: { ...theme.typography.titleSmall, marginBottom: theme.spacing.sm, textAlign: "center" },
  emptySub: { ...theme.typography.body, textAlign: "center", marginBottom: theme.spacing.lg },
  emptyCta: { alignSelf: "stretch" },
  card: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...theme.shadow,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: theme.spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.sm },
  cardTitle: { ...theme.typography.bodyMedium, flex: 1, fontSize: 17 },
  chevron: { fontSize: 22, marginLeft: theme.spacing.sm, lineHeight: 24 },
  cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  cardDate: { ...theme.typography.caption },
  fabStack: {
    position: "absolute",
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    left: theme.spacing.xl,
    alignItems: "flex-end",
    gap: theme.spacing.sm,
  },
  fab: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.full,
    ...theme.shadow,
  },
  fabText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium, fontWeight: "600" },
  fabSecondary: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  fabSecondaryText: { ...theme.typography.captionMedium },
});
