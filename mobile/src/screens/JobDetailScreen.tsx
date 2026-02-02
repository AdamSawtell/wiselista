import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { APP_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import type { Job, Photo } from "../types";
import { ROOM_LABELS } from "../types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  payment_pending: "Payment pending",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

export default function JobDetailScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: { jobId: string } };
}) {
  const { user, session } = useAuth();
  const jobId = route.params.jobId;
  const [job, setJob] = useState<Job | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function fetchJob() {
    const { data: jobData, error: jobErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user?.id ?? "")
      .single();
    if (jobErr || !jobData) {
      setJob(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setJob(jobData as Job);
    const { data: photosData } = await supabase
      .from("photos")
      .select("*")
      .eq("job_id", jobId)
      .order("sequence");
    setPhotos(photosData ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchJob();
  }, [jobId, user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJob();
  };

  async function handleSubmit() {
    if (!job || job.status !== "draft" || photos.length < 1) return;
    const token = session?.access_token;
    if (!token) {
      Alert.alert("Error", "Not signed in");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${APP_URL}/api/jobs/${jobId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Submit failed", data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      await fetchJob();
      Alert.alert("Submitted", "Job submitted for editing.");
    } catch {
      Alert.alert("Error", "Network error");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  if (!job) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textSecondary }}>Job not found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canSubmit = job.status === "draft" && photos.length >= 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Job</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        <View style={[styles.card, { backgroundColor: theme.colors.surface }, theme.shadow]}>
          <Text style={[styles.status, { color: theme.colors.textPrimary }]}>
            {STATUS_LABELS[job.status] ?? job.status}
          </Text>
          <Text style={[styles.date, { color: theme.colors.textMuted }]}>
            {new Date(job.created_at).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={[styles.section, { backgroundColor: theme.colors.surface }, theme.shadow]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Photos ({photos.length})
          </Text>
          {photos.map((p) => (
            <View
              key={p.id}
              style={[styles.photoRow, { borderBottomColor: theme.colors.borderLight }]}
            >
              <Text style={[styles.photoRoom, { color: theme.colors.textPrimary }]}>
                {ROOM_LABELS[p.room_type]}
              </Text>
              <Text style={[styles.photoSeq, { color: theme.colors.textMuted }]}>#{p.sequence + 1}</Text>
            </View>
          ))}
        </View>
        {job.status === "draft" && (
          <>
            <TouchableOpacity
              style={[styles.addPhoto, { backgroundColor: theme.colors.surfaceMuted }]}
              onPress={() => navigation.navigate("Camera", { jobId })}
              activeOpacity={0.8}
            >
              <Text style={[styles.addPhotoText, { color: theme.colors.textSecondary }]}>+ Add photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submit,
                { backgroundColor: theme.colors.primary },
                (!canSubmit || submitting) && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitText}>Submit for edit</Text>
              )}
            </TouchableOpacity>
            {photos.length < 1 && (
              <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                Add at least one photo to submit.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
  },
  back: { ...theme.typography.body, marginRight: theme.spacing.md },
  title: { ...theme.typography.titleSmall },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  status: { ...theme.typography.bodyMedium },
  date: { ...theme.typography.caption, marginTop: theme.spacing.xs },
  section: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  sectionTitle: { ...theme.typography.bodyMedium, marginBottom: theme.spacing.md },
  photoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  photoRoom: { ...theme.typography.captionMedium },
  photoSeq: { ...theme.typography.caption },
  addPhoto: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
  },
  addPhotoText: { ...theme.typography.body },
  submit: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
  button: { marginTop: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.sm },
  buttonText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
  hint: { ...theme.typography.caption, textAlign: "center" },
});
