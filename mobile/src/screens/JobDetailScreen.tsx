import React, { useCallback, useEffect, useState } from "react";
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
  Image,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { supabase, APP_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import type { Job, JobStatus, Photo } from "../types";
import { ROOM_LABELS, ROOM_TYPES, type RoomType } from "../types";
import StatusBadge from "../components/StatusBadge";
import PrimaryButton from "../components/PrimaryButton";
import { downloadJobZip, downloadPhoto } from "../lib/downloadPhotos";

function jobTitle(job: Job): string {
  if (job.name?.trim()) return job.name.trim();
  return `Property shoot · ${new Date(job.created_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
}

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
  const [signedUrls, setSignedUrls] = useState<Record<string, { original?: string; edited?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);
  const [pendingLibrary, setPendingLibrary] = useState<{
    assets: ImagePicker.ImagePickerAsset[];
    roomType: RoomType;
  } | null>(null);
  const [addingFromLibrary, setAddingFromLibrary] = useState(false);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({});

  async function fetchJob() {
    setLoadError(null);
    setFailedThumbnails({});
    try {
      const { data: jobData, error: jobErr } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", user?.id ?? "")
        .single();
      if (jobErr || !jobData) {
        setJob(null);
        return;
      }
      setJob(jobData as Job);
      const { data: photosData } = await supabase
        .from("photos")
        .select("*")
        .eq("job_id", jobId)
        .order("sequence");
      const photoList = photosData ?? [];
      setPhotos(photoList);

      const urls: Record<string, { original?: string; edited?: string }> = {};
      await Promise.all(
        photoList.map(async (p: Photo) => {
          const [orig, edited] = await Promise.all([
            supabase.storage.from("wiselista-photos").createSignedUrl(p.original_key, 3600),
            p.edited_key
              ? supabase.storage.from("wiselista-photos").createSignedUrl(p.edited_key, 3600)
              : { data: { signedUrl: null } },
          ]);
          urls[p.id] = {
            original: orig.data?.signedUrl ?? undefined,
            edited: edited.data?.signedUrl ?? undefined,
          };
        })
      );
      setSignedUrls(urls);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load job");
      setJob(null);
      setPhotos([]);
      setSignedUrls({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchJob();
  }, [jobId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id && jobId) fetchJob();
    }, [jobId, user?.id])
  );

  async function handleChooseFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photos to choose images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;
    setPendingLibrary({ assets: result.assets, roomType: "living_room" });
  }

  async function handleAddPendingToJob() {
    if (!pendingLibrary || !session?.access_token) return;
    setAddingFromLibrary(true);
    const startSequence = photos.length;
    try {
      for (let i = 0; i < pendingLibrary.assets.length; i++) {
        const asset = pendingLibrary.assets[i]!;
        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          type: asset.mimeType ?? "image/jpeg",
          name: asset.fileName ?? `photo-${i}.jpg`,
        } as unknown as Blob);
        formData.append("room_type", pendingLibrary.roomType);
        formData.append("sequence", String(startSequence + i));
        const res = await fetch(`${APP_URL}/api/jobs/${jobId}/photos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          Alert.alert("Upload failed", (data as { error?: string }).error ?? "Could not add photo");
          return;
        }
      }
      setPendingLibrary(null);
      await fetchJob();
    } catch {
      Alert.alert("Error", "Network error. Check your connection.");
    } finally {
      setAddingFromLibrary(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!session?.access_token) return;
    const deleteUrl = `${APP_URL.replace(/\/$/, "")}/api/jobs/${jobId}/photos/${photoId}`;
    Alert.alert("Remove photo", "Remove this photo from the shoot?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setRemovingPhotoId(photoId);
          try {
            const res = await fetch(deleteUrl, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) await fetchJob();
            else Alert.alert("Could not remove photo", `Error ${res.status}`);
          } catch {
            Alert.alert("Remove failed", "Network error");
          } finally {
            setRemovingPhotoId(null);
          }
        },
      },
    ]);
  }

  async function handleSubmit() {
    if (!job || job.status !== "draft" || photos.length < 1 || !session?.access_token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${APP_URL}/api/jobs/${jobId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        Alert.alert("Submit failed", data.error ?? `Error ${res.status}`);
        return;
      }
      if (data.url) {
        await fetchJob();
        await Linking.openURL(data.url);
        return;
      }
      await fetchJob();
      Alert.alert("Submitted", "Photos are being enhanced. Pull down to refresh status.");
    } catch (e) {
      Alert.alert("Submit failed", e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadZip() {
    if (!session?.access_token || !job) return;
    setDownloadingZip(true);
    const result = await downloadJobZip(jobId, session.access_token, job.name ?? undefined);
    setDownloadingZip(false);
    if (!result.ok) Alert.alert("Download failed", result.error ?? "Could not download ZIP");
  }

  async function handleDownloadPhoto(photo: Photo) {
    const urls = signedUrls[photo.id];
    const url = job?.status === "ready" && urls?.edited ? urls.edited : urls?.original;
    if (!url) return;
    setDownloadingPhotoId(photo.id);
    const result = await downloadPhoto(url, `wiselista-${photo.room_type}-${photo.sequence + 1}.jpg`);
    setDownloadingPhotoId(null);
    if (!result.ok) Alert.alert("Download failed", result.error ?? "Could not save photo");
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
        <Text style={{ color: theme.colors.textSecondary }}>{loadError ?? "Shoot not found"}</Text>
        <PrimaryButton label="Back" onPress={() => navigation.goBack()} style={{ marginTop: theme.spacing.lg }} />
      </View>
    );
  }

  const isDraft = job.status === "draft";
  const isReady = job.status === "ready";
  const isProcessing = job.status === "processing" || job.status === "submitted";
  const canSubmit = isDraft && photos.length >= 1;
  const editedCount = photos.filter((p) => p.edited_key).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: theme.colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {jobTitle(job)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJob(); }} tintColor={theme.colors.primary} />
        }
      >
        <View style={[styles.metaCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.metaRow}>
            <StatusBadge status={job.status as JobStatus} />
            <Text style={[styles.metaDate, { color: theme.colors.textMuted }]}>
              {new Date(job.created_at).toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          {isProcessing && (
            <Text style={[styles.processingNote, { color: theme.colors.textSecondary }]}>
              Enhancing your photos — usually ~20 seconds per image. Pull to refresh.
            </Text>
          )}
          {job.status === "failed" && (
            <View style={[styles.failedBox, { borderColor: theme.colors.error }]}>
              <Text style={[styles.failedTitle, { color: theme.colors.error }]}>Enhancement failed</Text>
              {job.failure_message ? (
                <Text style={[styles.failedMsg, { color: theme.colors.textPrimary }]}>{job.failure_message}</Text>
              ) : null}
            </View>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
          Photos · {photos.length}
          {isReady && editedCount > 0 ? ` · ${editedCount} enhanced` : ""}
        </Text>

        {photos.length === 0 ? (
          <Text style={[styles.emptyPhotos, { color: theme.colors.textMuted }]}>No photos yet.</Text>
        ) : (
          photos.map((p) => {
            const urls = signedUrls[p.id];
            const showEdited = isReady && urls?.edited;
            const thumbUri = showEdited ? urls.edited : urls?.original;
            return (
              <View
                key={p.id}
                style={[styles.photoRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                {thumbUri && !failedThumbnails[p.id] ? (
                  <Image
                    source={{ uri: thumbUri }}
                    style={styles.thumb}
                    resizeMode="cover"
                    onError={() => setFailedThumbnails((prev) => ({ ...prev, [p.id]: true }))}
                  />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: theme.colors.surfaceMuted }]} />
                )}
                <View style={styles.photoInfo}>
                  <Text style={[styles.photoRoom, { color: theme.colors.textPrimary }]}>{ROOM_LABELS[p.room_type]}</Text>
                  <Text style={[styles.photoSeq, { color: theme.colors.textMuted }]}>
                    Photo {p.sequence + 1}
                    {showEdited ? " · Enhanced" : isDraft ? " · Original" : ""}
                  </Text>
                </View>
                <View style={styles.photoActions}>
                  {(isReady || (urls?.edited && job.status !== "draft")) && thumbUri && (
                    <TouchableOpacity
                      onPress={() => handleDownloadPhoto(p)}
                      disabled={downloadingPhotoId === p.id}
                      style={styles.iconAction}
                    >
                      {downloadingPhotoId === p.id ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <Text style={[styles.iconActionText, { color: theme.colors.primary }]}>Save</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {isDraft && (
                    <TouchableOpacity
                      onPress={() => handleDeletePhoto(p.id)}
                      disabled={removingPhotoId === p.id}
                      style={styles.iconAction}
                    >
                      {removingPhotoId === p.id ? (
                        <ActivityIndicator size="small" color={theme.colors.error} />
                      ) : (
                        <Text style={[styles.iconActionText, { color: theme.colors.error }]}>Remove</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        {pendingLibrary && (
          <View style={[styles.pendingBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.pendingTitle, { color: theme.colors.textPrimary }]}>
              {pendingLibrary.assets.length} selected from library
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomScroll}>
              {ROOM_TYPES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roomChip,
                    { borderColor: theme.colors.border },
                    pendingLibrary.roomType === r && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setPendingLibrary((prev) => (prev ? { ...prev, roomType: r } : null))}
                >
                  <Text
                    style={[
                      styles.roomChipText,
                      { color: theme.colors.textPrimary },
                      pendingLibrary.roomType === r && { color: theme.colors.textOnPrimary },
                    ]}
                  >
                    {ROOM_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <PrimaryButton label="Add to shoot" onPress={handleAddPendingToJob} loading={addingFromLibrary} />
            <PrimaryButton label="Cancel" onPress={() => setPendingLibrary(null)} variant="ghost" />
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        {isDraft && !pendingLibrary && (
          <>
            <View style={styles.draftActions}>
              <PrimaryButton
                label="Take photo"
                onPress={() => navigation.navigate("Camera", { jobId, startSequence: photos.length })}
                variant="secondary"
                style={styles.halfBtn}
              />
              <PrimaryButton label="Library" onPress={handleChooseFromLibrary} variant="secondary" style={styles.halfBtn} />
            </View>
            <PrimaryButton
              label="Submit for edit"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
            />
            {photos.length < 1 && (
              <Text style={[styles.bottomHint, { color: theme.colors.textMuted }]}>Add at least one photo to submit.</Text>
            )}
          </>
        )}
        {isReady && editedCount > 0 && (
          <PrimaryButton
            label={`Download all (${editedCount})`}
            onPress={handleDownloadZip}
            loading={downloadingZip}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    gap: theme.spacing.md,
  },
  back: { ...theme.typography.captionMedium, minWidth: 40 },
  headerTitle: { ...theme.typography.bodyMedium, flex: 1, fontSize: 17 },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 160 },
  metaCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaDate: { ...theme.typography.caption },
  processingNote: { ...theme.typography.caption, marginTop: theme.spacing.md },
  failedBox: { marginTop: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderRadius: theme.radius.sm },
  failedTitle: { ...theme.typography.captionMedium },
  failedMsg: { ...theme.typography.caption, marginTop: 4 },
  sectionLabel: { ...theme.typography.label, marginBottom: theme.spacing.sm },
  emptyPhotos: { ...theme.typography.body, marginBottom: theme.spacing.lg },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  thumb: { width: 64, height: 48, borderRadius: theme.radius.sm },
  photoInfo: { flex: 1 },
  photoRoom: { ...theme.typography.bodyMedium },
  photoSeq: { ...theme.typography.caption, marginTop: 2 },
  photoActions: { alignItems: "flex-end", gap: 4 },
  iconAction: { paddingVertical: 4, paddingHorizontal: 2 },
  iconActionText: { ...theme.typography.captionMedium },
  pendingBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
  },
  pendingTitle: { ...theme.typography.bodyMedium, marginBottom: theme.spacing.sm },
  roomScroll: { marginBottom: theme.spacing.md },
  roomChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginRight: theme.spacing.sm,
  },
  roomChipText: { ...theme.typography.captionMedium },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
  },
  draftActions: { flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  halfBtn: { flex: 1 },
  bottomHint: { ...theme.typography.caption, textAlign: "center", marginTop: theme.spacing.sm },
});
