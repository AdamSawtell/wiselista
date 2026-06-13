import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase, APP_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import type { Photo } from "../types";
import { ROOM_LABELS } from "../types";

export default function ShootReviewScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: { jobId: string; propertyName?: string } };
}) {
  const { session } = useAuth();
  const { jobId, propertyName } = route.params;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadPhotos() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("photos")
        .select("*")
        .eq("job_id", jobId)
        .order("sequence");
      const list = (data ?? []) as Photo[];
      setPhotos(list);
      const urls: Record<string, string> = {};
      await Promise.all(
        list.map(async (p) => {
          const { data: signed } = await supabase.storage
            .from("wiselista-photos")
            .createSignedUrl(p.original_key, 3600);
          if (signed?.signedUrl) urls[p.id] = signed.signedUrl;
        })
      );
      setSignedUrls(urls);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadPhotos();
    }, [jobId])
  );

  async function handleSubmit() {
    const token = session?.access_token;
    if (!token) {
      Alert.alert("Error", "Not signed in");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${APP_URL.replace(/\/$/, "")}/api/jobs/${jobId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        Alert.alert("Submit failed", data.error ?? `Error ${res.status}`);
        return;
      }
      if (data.url) {
        await Linking.openURL(data.url);
        navigation.replace("JobDetail", { jobId });
        return;
      }
      Alert.alert(
        "Enhancing photos",
        "Your photos are being enhanced. This usually takes about 20 seconds per photo.",
        [{ text: "OK", onPress: () => navigation.replace("JobDetail", { jobId }) }]
      );
    } catch (e) {
      Alert.alert("Submit failed", e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

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
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Review shoot</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {propertyName ?? "Your property"}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {photos.length} photo{photos.length === 1 ? "" : "s"} ready to enhance. Submit when you&apos;re happy.
        </Text>

        {photos.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              No photos yet. Go back and capture at least one room.
            </Text>
            <TouchableOpacity
              style={[styles.backShootBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() =>
                navigation.replace("GuidedShoot", { jobId, propertyName, stepIndex: 0 })
              }
            >
              <Text style={styles.backShootBtnText}>Continue shooting</Text>
            </TouchableOpacity>
          </View>
        ) : (
          photos.map((p) => (
            <View
              key={p.id}
              style={[styles.photoRow, { backgroundColor: theme.colors.surface }, theme.shadow]}
            >
              {signedUrls[p.id] ? (
                <Image source={{ uri: signedUrls[p.id] }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, { backgroundColor: theme.colors.surfaceMuted }]} />
              )}
              <View style={styles.photoMeta}>
                <Text style={[styles.photoRoom, { color: theme.colors.textPrimary }]}>
                  {ROOM_LABELS[p.room_type]}
                </Text>
                <Text style={[styles.photoSeq, { color: theme.colors.textMuted }]}>
                  Photo {p.sequence + 1}
                </Text>
              </View>
            </View>
          ))
        )}

        {photos.length > 0 && (
          <>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.colors.primary }, submitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>Submit for edit</Text>
              )}
            </TouchableOpacity>
            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
              Enhancement takes about 20 seconds per photo.
            </Text>
          </>
        )}

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate("JobDetail", { jobId })}
        >
          <Text style={[styles.linkBtnText, { color: theme.colors.primary }]}>Open full job details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: theme.spacing.md, borderBottomWidth: 1 },
  headerTitle: { ...theme.typography.titleSmall },
  content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  title: { ...theme.typography.title, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body, marginBottom: theme.spacing.lg },
  emptyCard: { padding: theme.spacing.xl, borderRadius: theme.radius.md, alignItems: "center" },
  emptyText: { ...theme.typography.body, textAlign: "center", marginBottom: theme.spacing.lg },
  backShootBtn: { padding: theme.spacing.md, borderRadius: theme.radius.sm },
  backShootBtnText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  thumb: { width: 72, height: 54, borderRadius: theme.radius.sm },
  photoMeta: { flex: 1 },
  photoRoom: { ...theme.typography.bodyMedium },
  photoSeq: { ...theme.typography.caption },
  submitBtn: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.7 },
  submitBtnText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
  hint: { ...theme.typography.caption, textAlign: "center", marginTop: theme.spacing.sm },
  linkBtn: { marginTop: theme.spacing.lg, alignItems: "center" },
  linkBtnText: { ...theme.typography.captionMedium },
});
