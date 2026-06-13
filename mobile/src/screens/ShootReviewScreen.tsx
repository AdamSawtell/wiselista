import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase, APP_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import type { Photo } from "../types";
import { ROOM_LABELS } from "../types";
import PrimaryButton from "../components/PrimaryButton";

const GRID_GAP = 8;
const GRID_PAD = theme.spacing.lg;
const COLS = 2;
const TILE_W = (Dimensions.get("window").width - GRID_PAD * 2 - GRID_GAP) / COLS;

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
        <Text style={[styles.headerKicker, { color: theme.colors.primary }]}>Review</Text>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {propertyName ?? "Your property"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {photos.length} photo{photos.length === 1 ? "" : "s"} ready for enhancement.
        </Text>

        {photos.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: theme.colors.border }]}>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              No photos captured yet.
            </Text>
            <PrimaryButton
              label="Continue shooting"
              onPress={() => navigation.replace("GuidedShoot", { jobId, propertyName, stepIndex: 0 })}
              style={{ marginTop: theme.spacing.lg }}
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map((p) => (
              <View key={p.id} style={[styles.tile, { width: TILE_W, borderColor: theme.colors.border }]}>
                {signedUrls[p.id] ? (
                  <Image source={{ uri: signedUrls[p.id] }} style={styles.tileImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.tileImage, { backgroundColor: theme.colors.surfaceMuted }]} />
                )}
                <Text style={[styles.tileLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {ROOM_LABELS[p.room_type]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {photos.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <PrimaryButton label="Submit for edit" onPress={handleSubmit} loading={submitting} />
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
            ~20 seconds per photo to enhance
          </Text>
          <PrimaryButton
            label="View shoot details"
            onPress={() => navigation.navigate("JobDetail", { jobId })}
            variant="ghost"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  headerKicker: { ...theme.typography.label, marginBottom: 4 },
  headerTitle: { ...theme.typography.title },
  content: { padding: GRID_PAD, paddingBottom: 180 },
  subtitle: { ...theme.typography.body, marginBottom: theme.spacing.lg },
  emptyBox: {
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    alignItems: "center",
  },
  emptyText: { ...theme.typography.body, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  tile: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
  },
  tileImage: { width: "100%", height: TILE_W * 0.75 },
  tileLabel: {
    ...theme.typography.captionMedium,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
  },
  hint: { ...theme.typography.caption, textAlign: "center", marginTop: theme.spacing.sm },
});
