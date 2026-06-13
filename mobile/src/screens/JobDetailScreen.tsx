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
import { supabase } from "../lib/supabase";
import { APP_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import type { Job, Photo } from "../types";
import { ROOM_LABELS, ROOM_TYPES, type RoomType } from "../types";

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
  const [signedUrls, setSignedUrls] = useState<Record<string, { original?: string; edited?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingLibrary, setPendingLibrary] = useState<{
    assets: ImagePicker.ImagePickerAsset[];
    roomType: RoomType;
  } | null>(null);
  const [addingFromLibrary, setAddingFromLibrary] = useState(false);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({});
  const [lastDelete, setLastDelete] = useState<{
    rid: string;
    url: string;
    status: number | null;
    body: string;
    durationMs: number | null;
    error: string | null;
  } | null>(null);
  const [healthResult, setHealthResult] = useState<{
    ok: boolean;
    status: number;
    body: string;
    durationMs: number;
    error?: string;
  } | null>(null);

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

  // Refetch when screen gains focus (e.g. return from Camera or after add) so new photos show without leaving the job
  useFocusEffect(
    useCallback(() => {
      if (user?.id && jobId) fetchJob();
    }, [jobId, user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchJob();
  };

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
          setAddingFromLibrary(false);
          return;
        }
      }
      const added = pendingLibrary.assets.length;
      setPendingLibrary(null);
      await fetchJob();
      Alert.alert("Photos added", `${added} photo${added === 1 ? "" : "s"} added. They should appear in Storage and in this job.`);
    } catch {
      Alert.alert("Error", "Network error. Check your connection and that the app URL is correct.");
    } finally {
      setAddingFromLibrary(false);
    }
  }

  function genRequestId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async function handleTestApi() {
    const baseUrl = APP_URL || "https://wiselista.com";
    const url = `${baseUrl.replace(/\/$/, "")}/api/health`;
    const start = Date.now();
    try {
      const res = await fetch(url);
      const body = await res.text();
      setHealthResult({
        ok: res.ok,
        status: res.status,
        body,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHealthResult({
        ok: false,
        status: 0,
        body: "",
        durationMs: Date.now() - start,
        error: msg,
      });
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!session?.access_token) {
      Alert.alert("Error", "Not signed in. Sign out and sign in again, then try Remove.");
      return;
    }
    const baseUrl = APP_URL || "https://wiselista.com";
    const deleteUrl = `${baseUrl.replace(/\/$/, "")}/api/jobs/${jobId}/photos/${photoId}`;
    const rid = genRequestId();
    Alert.alert("Remove photo", "Remove this photo from the job?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setRemovingPhotoId(photoId);
          const start = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          let res: Response | null = null;
          let bodyText = "";
          try {
            res = await fetch(deleteUrl, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "X-Request-Id": rid,
              },
              signal: controller.signal,
            });
            bodyText = await res.text();
            clearTimeout(timeoutId);
            const durationMs = Date.now() - start;
            setLastDelete({
              rid,
              url: deleteUrl,
              status: res.status,
              body: bodyText,
              durationMs,
              error: null,
            });
            if (res.ok) {
              let parsed: { ok?: boolean } = {};
              try {
                parsed = bodyText ? JSON.parse(bodyText) : {};
              } catch {
                // ignore
              }
              if (parsed.ok === true) {
                setPhotos((prev) => prev.filter((p) => p.id !== photoId));
                setSignedUrls((prev) => {
                  const next = { ...prev };
                  delete next[photoId];
                  return next;
                });
              }
              await fetchJob();
            } else {
              let parsed: { error?: string; rid?: string } = {};
              try {
                parsed = bodyText ? JSON.parse(bodyText) : {};
              } catch {
                // leave parsed {}
              }
              const msg = parsed.error ?? `Server error ${res.status}`;
              Alert.alert("Could not remove photo", `${msg} (rid: ${parsed.rid ?? rid})`);
            }
          } catch (e) {
            clearTimeout(timeoutId);
            const durationMs = Date.now() - start;
            const errMsg = e instanceof Error ? e.message : String(e);
            const withBody = bodyText ? `${errMsg} | response: ${bodyText}` : errMsg;
            setLastDelete({
              rid,
              url: deleteUrl,
              status: res?.status ?? null,
              body: bodyText,
              durationMs,
              error: withBody,
            });
            Alert.alert("Remove failed", withBody);
          } finally {
            setRemovingPhotoId(null);
          }
        },
      },
    ]);
  }

  async function handleSubmit() {
    if (!job || job.status !== "draft" || photos.length < 1) return;
    const token = session?.access_token;
    if (!token) {
      Alert.alert("Error", "Not signed in");
      return;
    }
    const url = `${APP_URL}/api/jobs/${jobId}/submit`;
    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      let data: { error?: string; url?: string } = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        // Non-JSON response (e.g. HTML error page)
        if (!res.ok) {
          Alert.alert("Submit failed", `Server error ${res.status}. Check that the app URL is correct.`);
          return;
        }
      }
      if (!res.ok) {
        Alert.alert("Submit failed", data.error ?? `Error ${res.status}`);
        return;
      }
      if (data.url) {
        await fetchJob();
        const opened = await Linking.openURL(data.url);
        if (!opened) {
          Alert.alert("Payment", "Open the payment link in your browser to complete checkout.");
        }
        return;
      }
      await fetchJob();
      Alert.alert("Submitted", "Job submitted for editing. Status will update to Processing, then Ready.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network error";
      Alert.alert(
        "Submit failed",
        `${message}. If using a device or simulator, set EXPO_PUBLIC_APP_URL to your deployed URL (e.g. https://wiselista.com).`
      );
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
  if (!job) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textSecondary }}>
          {loadError ?? "Job not found"}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        {loadError && (
          <TouchableOpacity
            onPress={() => { setLoadError(null); setLoading(true); fetchJob(); }}
            style={[styles.button, { backgroundColor: theme.colors.surface, marginTop: theme.spacing.sm }]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>Try again</Text>
          </TouchableOpacity>
        )}
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
          {job.status === "failed" && (
            <View style={[styles.failedCard, { backgroundColor: theme.colors.error + "20", borderColor: theme.colors.error }]}>
              <Text style={[styles.failedTitle, { color: theme.colors.error }]}>Enhancement failed</Text>
              {job.failure_message ? (
                <Text style={[styles.failedMessage, { color: theme.colors.textPrimary }]}>{job.failure_message}</Text>
              ) : null}
              <Text style={[styles.failedHint, { color: theme.colors.textMuted }]}>
                You can delete this job and try again, or contact support with the job ID.
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.section, { backgroundColor: theme.colors.surface }, theme.shadow]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Photos ({photos.length})
          </Text>
          {job.status === "draft" && photos.length > 0 && (
            <Text style={[styles.hint, { color: theme.colors.textMuted, marginBottom: theme.spacing.sm }]}>
              These will be enhanced. Remove any you don&apos;t want before submitting.
            </Text>
          )}
          {photos.map((p) => (
            <View
              key={p.id}
              style={[styles.photoRow, { borderBottomColor: theme.colors.borderLight }]}
            >
              {signedUrls[p.id]?.original && !failedThumbnails[p.id] ? (
                <Image
                  source={{ uri: signedUrls[p.id].original }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                  onError={() => setFailedThumbnails((prev) => ({ ...prev, [p.id]: true }))}
                />
              ) : (
                <View style={[styles.thumbnailPlaceholder, { backgroundColor: theme.colors.borderLight }]} />
              )}
              <View style={styles.photoInfo}>
                <Text style={[styles.photoRoom, { color: theme.colors.textPrimary }]}>
                  {ROOM_LABELS[p.room_type]}
                </Text>
                <Text style={[styles.photoSeq, { color: theme.colors.textMuted }]}>#{p.sequence + 1}</Text>
              </View>
              {job.status === "draft" && (
                <TouchableOpacity
                  onPress={() => handleDeletePhoto(p.id)}
                  disabled={removingPhotoId === p.id}
                  style={[styles.removeBtn, { borderColor: theme.colors.error }, removingPhotoId === p.id && { opacity: 0.6 }]}
                >
                  {removingPhotoId === p.id ? (
                    <ActivityIndicator size="small" color={theme.colors.error} />
                  ) : (
                    <Text style={[styles.removeBtnText, { color: theme.colors.error }]}>Remove</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        {pendingLibrary && (
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceMuted }, theme.shadow]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              {pendingLibrary.assets.length} photo(s) from library
            </Text>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Room type for all</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomScroll}>
              {ROOM_TYPES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roomChip,
                    { backgroundColor: theme.colors.surface },
                    pendingLibrary.roomType === r && { backgroundColor: theme.colors.primary },
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
            <View style={styles.pendingActions}>
              <TouchableOpacity
                style={[styles.addPendingBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddPendingToJob}
                disabled={addingFromLibrary}
              >
                {addingFromLibrary ? (
                  <ActivityIndicator color={theme.colors.textOnPrimary} />
                ) : (
                  <Text style={[styles.addPendingBtnText, { color: theme.colors.textOnPrimary }]}>
                    Add to job
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelPendingBtn}
                onPress={() => setPendingLibrary(null)}
                disabled={addingFromLibrary}
              >
                <Text style={[styles.cancelPendingText, { color: theme.colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {job.status === "draft" && !pendingLibrary && (
          <>
            <View style={styles.addPhotoRow}>
              <TouchableOpacity
                style={[styles.addPhoto, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => navigation.navigate("Camera", { jobId, startSequence: photos.length })}
                activeOpacity={0.8}
              >
                <Text style={[styles.addPhotoText, { color: theme.colors.textSecondary }]}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addPhoto, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={handleChooseFromLibrary}
                activeOpacity={0.8}
              >
                <Text style={[styles.addPhotoText, { color: theme.colors.textSecondary }]}>
                  Choose from library
                </Text>
              </TouchableOpacity>
            </View>
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
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceMuted }, theme.shadow]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Debug (e2e)</Text>
          <Text style={[styles.debugLabel, { color: theme.colors.textMuted }]}>APP_URL</Text>
          <Text style={[styles.debugValue, { color: theme.colors.textPrimary }]} selectable>
            {APP_URL || "(empty)"}
          </Text>
          <Text style={[styles.debugLabel, { color: theme.colors.textMuted }]}>Delete URL (last)</Text>
          <Text style={[styles.debugValue, { color: theme.colors.textPrimary }]} selectable numberOfLines={2}>
            {lastDelete?.url ?? `${(APP_URL || "https://wiselista.com").replace(/\/$/, "")}/api/jobs/.../photos/...`}
          </Text>
          {lastDelete && (
            <>
              <Text style={[styles.debugLabel, { color: theme.colors.textMuted }]}>Last delete</Text>
              <Text style={[styles.debugValue, { color: theme.colors.textPrimary }]} selectable>
                rid: {lastDelete.rid}
              </Text>
              <Text style={[styles.debugValue, { color: theme.colors.textPrimary }]}>
                status: {lastDelete.status ?? "—"} | duration: {lastDelete.durationMs ?? "—"} ms
              </Text>
              <Text style={[styles.debugValue, { color: theme.colors.textPrimary }]} selectable numberOfLines={3}>
                body: {lastDelete.body || "—"}
              </Text>
              {lastDelete.error != null && (
                <Text style={[styles.debugValue, { color: theme.colors.error }]} selectable numberOfLines={5}>
                  error: {lastDelete.error}
                </Text>
              )}
            </>
          )}
          <TouchableOpacity
            style={[styles.testApiBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleTestApi}
          >
            <Text style={[styles.testApiBtnText, { color: theme.colors.textOnPrimary }]}>Test API</Text>
          </TouchableOpacity>
          {healthResult && (
            <>
              <Text style={[styles.debugLabel, { color: theme.colors.textMuted }]}>Health</Text>
              <Text style={[styles.debugValue, { color: theme.colors.textPrimary }]}>
                ok: {String(healthResult.ok)} | status: {healthResult.status} | {healthResult.durationMs} ms
              </Text>
              <Text style={[styles.debugValue, { color: theme.colors.textPrimary }]} selectable numberOfLines={2}>
                {healthResult.error ?? (healthResult.body || "—")}
              </Text>
            </>
          )}
        </View>
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
  failedCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  failedTitle: { ...theme.typography.bodyMedium },
  failedMessage: { ...theme.typography.caption, marginTop: theme.spacing.xs },
  failedHint: { ...theme.typography.caption, marginTop: theme.spacing.sm },
  section: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  sectionTitle: { ...theme.typography.bodyMedium, marginBottom: theme.spacing.md },
  label: { ...theme.typography.caption, marginBottom: theme.spacing.xs },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    gap: theme.spacing.sm,
  },
  thumbnail: { width: 56, height: 56, borderRadius: theme.radius.sm },
  thumbnailPlaceholder: { width: 56, height: 56, borderRadius: theme.radius.sm },
  photoInfo: { flex: 1 },
  photoRoom: { ...theme.typography.captionMedium },
  photoSeq: { ...theme.typography.caption },
  removeBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  removeBtnText: { ...theme.typography.captionMedium },
  roomScroll: { marginBottom: theme.spacing.sm },
  roomChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    marginRight: theme.spacing.sm,
  },
  roomChipText: { ...theme.typography.captionMedium },
  pendingActions: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  addPendingBtn: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
  },
  addPendingBtnText: { ...theme.typography.bodyMedium },
  cancelPendingBtn: { padding: theme.spacing.md, alignItems: "center" },
  cancelPendingText: { ...theme.typography.body },
  addPhotoRow: { flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.md },
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
  debugLabel: { ...theme.typography.caption, marginTop: theme.spacing.sm },
  debugValue: { ...theme.typography.caption, marginBottom: theme.spacing.xs },
  testApiBtn: { marginTop: theme.spacing.md, padding: theme.spacing.sm, borderRadius: theme.radius.sm, alignItems: "center" },
  testApiBtnText: { ...theme.typography.bodyMedium },
});
