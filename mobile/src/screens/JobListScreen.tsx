import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import type { Job, JobStatus } from "../types";
import StatusBadge from "../components/StatusBadge";
import PrimaryButton from "../components/PrimaryButton";
import { fetchJobThumbnailUrls } from "../lib/photoThumbnails";

function jobTitle(job: Job): string {
  if (job.name?.trim()) return job.name.trim();
  return `Property shoot · ${new Date(job.created_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
}

const LIST_POLL_MS = 10_000;
const ACTIVE_STATUSES: JobStatus[] = ["processing", "submitted", "payment_pending"];

function activeStatusHint(status: JobStatus): string | null {
  switch (status) {
    case "processing":
    case "submitted":
      return "Enhancing photos…";
    case "payment_pending":
      return "Awaiting payment";
    default:
      return null;
  }
}

export default function JobListScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchJobs(silent = false) {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, status, created_at, updated_at, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) {
        const list = (data ?? []) as Job[];
        setJobs(list);
        const thumbs = await fetchJobThumbnailUrls(list);
        setThumbnails(thumbs);
      }
    } catch {
      if (!silent) {
        setJobs([]);
        setThumbnails({});
      }
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  const hasActiveJobs = useMemo(
    () => jobs.some((j) => ACTIVE_STATUSES.includes(j.status)),
    [jobs]
  );

  useEffect(() => {
    fetchJobs();
  }, [user?.id]);

  useEffect(() => {
    if (!hasActiveJobs || !user?.id) return;
    const id = setInterval(() => {
      void fetchJobs(true);
    }, LIST_POLL_MS);
    return () => clearInterval(id);
  }, [hasActiveJobs, user?.id]);

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
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Ionicons name="camera-outline" size={32} color={theme.colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No shoots yet</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
              Start a guided property shoot. We enhance every photo for your listing.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const thumb = thumbnails[item.id];
          const hint = activeStatusHint(item.status);
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
              onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}
              activeOpacity={0.7}
            >
              <View style={[styles.thumbWrap, { backgroundColor: theme.colors.surfaceMuted }]}>
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <Ionicons name="home-outline" size={28} color={theme.colors.textMuted} />
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
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
                {hint ? (
                  <Text style={[styles.activeHint, { color: theme.colors.textSecondary }]}>{hint}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          );
        }}
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
  list: { padding: theme.spacing.md, paddingBottom: 120, gap: theme.spacing.sm },
  emptyList: { flexGrow: 1, paddingBottom: 120 },
  empty: { padding: theme.spacing.xl, paddingTop: 48, alignItems: "center" },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  emptyTitle: { ...theme.typography.titleSmall, marginBottom: theme.spacing.sm },
  emptySub: { ...theme.typography.body, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
  },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: "100%", height: "100%" },
  cardBody: { flex: 1 },
  rowTitle: { ...theme.typography.bodyMedium, marginBottom: 6 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" },
  activeHint: { ...theme.typography.caption, marginTop: 4 },
  rowDate: { ...theme.typography.caption },
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
