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
} from "react-native";
import { supabase } from "../lib/supabase";
import { APP_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!job) {
    return (
      <View style={styles.centered}>
        <Text>Job not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canSubmit = job.status === "draft" && photos.length >= 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Job</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <Text style={styles.status}>{STATUS_LABELS[job.status] ?? job.status}</Text>
          <Text style={styles.date}>{new Date(job.created_at).toLocaleString()}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
          {photos.map((p) => (
            <View key={p.id} style={styles.photoRow}>
              <Text style={styles.photoRoom}>{ROOM_LABELS[p.room_type]}</Text>
              <Text style={styles.photoSeq}>#{p.sequence + 1}</Text>
            </View>
          ))}
        </View>
        {job.status === "draft" && (
          <>
            <TouchableOpacity
              style={styles.addPhoto}
              onPress={() => navigation.navigate("Camera", { jobId })}
            >
              <Text style={styles.addPhotoText}>+ Add photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submit, (!canSubmit || submitting) && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit for edit</Text>
              )}
            </TouchableOpacity>
            {photos.length < 1 && (
              <Text style={styles.hint}>Add at least one photo to submit.</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  back: { fontSize: 16, color: "#3b82f6", marginRight: 16 },
  title: { fontSize: 20, fontWeight: "600", color: "#0f172a" },
  scroll: { flex: 1 },
  card: { margin: 16, padding: 16, backgroundColor: "#fff", borderRadius: 8 },
  status: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  date: { fontSize: 14, color: "#64748b", marginTop: 4 },
  section: { marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: "#fff", borderRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a", marginBottom: 12 },
  photoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  photoRoom: { fontSize: 14, color: "#0f172a" },
  photoSeq: { fontSize: 14, color: "#64748b" },
  addPhoto: { marginHorizontal: 16, marginBottom: 12, padding: 16, backgroundColor: "#e2e8f0", borderRadius: 8, alignItems: "center" },
  addPhotoText: { fontSize: 16, color: "#475569" },
  submit: { marginHorizontal: 16, marginBottom: 8, padding: 16, backgroundColor: "#0f172a", borderRadius: 8, alignItems: "center" },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  button: { marginTop: 16, padding: 16, backgroundColor: "#0f172a", borderRadius: 8 },
  buttonText: { color: "#fff" },
  hint: { marginHorizontal: 16, marginBottom: 24, fontSize: 14, color: "#64748b", textAlign: "center" },
});
