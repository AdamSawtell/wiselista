import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import { ROOM_TYPES, ROOM_LABELS, type RoomType } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FRAME_PADDING = 24;

export default function CameraScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: { jobId: string } };
}) {
  const { user } = useAuth();
  const jobId = route.params.jobId;
  const [roomType, setRoomType] = useState<RoomType>("living_room");
  const [permission, requestPermission] = useCameraPermissions();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) requestPermission();
  }, [permission]);

  async function handleCapture() {
    if (!cameraRef.current || !user || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: true,
      });
      if (!photo?.uri) {
        setError("Failed to capture");
        setUploading(false);
        return;
      }
      const ext = "jpg";
      const key = `${user.id}/${jobId}/${crypto.randomUUID()}.${ext}`;

      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from("wiselista-photos")
        .upload(key, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }

      const { data: photos } = await supabase
        .from("photos")
        .select("sequence")
        .eq("job_id", jobId)
        .order("sequence", { ascending: false })
        .limit(1);
      const nextSeq = (photos?.[0]?.sequence ?? -1) + 1;

      const { error: insertError } = await supabase.from("photos").insert({
        job_id: jobId,
        room_type: roomType,
        sequence: nextSeq,
        original_key: key,
      });

      if (insertError) {
        setError(insertError.message);
        setUploading(false);
        return;
      }
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(false);
  }

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.cameraBar }]}>
        <Text style={[styles.permissionText, { color: theme.colors.cameraBarText }]}>
          Requesting camera access…
        </Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.cameraBar }]}>
        <Text style={[styles.permissionText, { color: theme.colors.cameraBarText }]}>
          Camera access is required to capture property photos.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.surface }]}
          onPress={requestPermission}
        >
          <Text style={[styles.buttonText, { color: theme.colors.primary }]}>Grant permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelText, { color: theme.colors.cameraBarMuted }]}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const frameWidth = SCREEN_WIDTH - FRAME_PADDING * 2;

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} />
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.frame, { width: frameWidth, height: frameWidth * 0.75 }]}>
          <Text style={styles.frameLabel}>{ROOM_LABELS[roomType]}</Text>
          <View style={styles.frameGuide} />
        </View>
      </View>
      <View style={[styles.controls, { backgroundColor: theme.colors.cameraBar }]}>
        <Text style={[styles.roomLabel, { color: theme.colors.cameraBarMuted }]}>Room type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roomRow}
        >
          {ROOM_TYPES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.roomChip,
                roomType === r && { backgroundColor: theme.colors.surface },
              ]}
              onPress={() => setRoomType(r)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roomChipText,
                  { color: theme.colors.cameraBarText },
                  roomType === r && { color: theme.colors.primary, fontWeight: "600" },
                ]}
              >
                {ROOM_LABELS[r]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}
        <TouchableOpacity
          style={[styles.capture, { backgroundColor: theme.colors.surface }, uploading && styles.captureDisabled]}
          onPress={handleCapture}
          disabled={uploading}
          activeOpacity={0.9}
        >
          {uploading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Text style={[styles.captureText, { color: theme.colors.primary }]}>Capture</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: theme.colors.cameraBarMuted }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  frame: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: theme.radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  frameLabel: {
    position: "absolute",
    top: theme.spacing.sm,
    left: theme.spacing.md,
    color: "rgba(255,255,255,0.95)",
    ...theme.typography.captionMedium,
  },
  frameGuide: {
    width: "90%",
    height: "70%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderStyle: "dashed",
  },
  controls: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  roomLabel: { ...theme.typography.label, marginBottom: theme.spacing.sm },
  roomRow: { flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  roomChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  roomChipText: { ...theme.typography.captionMedium },
  error: { ...theme.typography.caption, marginBottom: theme.spacing.sm },
  capture: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  captureDisabled: { opacity: 0.7 },
  captureText: { ...theme.typography.bodyMedium },
  back: { alignItems: "center" },
  backText: { ...theme.typography.caption },
  permissionText: { ...theme.typography.body, textAlign: "center", marginBottom: theme.spacing.md },
  button: { padding: theme.spacing.md, borderRadius: theme.radius.sm, marginBottom: theme.spacing.md },
  buttonText: { ...theme.typography.bodyMedium },
  cancel: {},
  cancelText: {},
});
