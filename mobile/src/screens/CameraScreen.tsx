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
      <View style={styles.centered}>
        <Text>Requesting camera access…</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera access is required to capture photos.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Back</Text>
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
      <View style={styles.controls}>
        <Text style={styles.roomLabel}>Room type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roomRow}
        >
          {ROOM_TYPES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roomChip, roomType === r && styles.roomChipActive]}
              onPress={() => setRoomType(r)}
            >
              <Text style={[styles.roomChipText, roomType === r && styles.roomChipTextActive]}>
                {ROOM_LABELS[r]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          style={[styles.capture, uploading && styles.captureDisabled]}
          onPress={handleCapture}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.captureText}>Capture</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  frame: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  frameLabel: {
    position: "absolute",
    top: 8,
    left: 12,
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
  },
  frameGuide: {
    width: "90%",
    height: "70%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderStyle: "dashed",
  },
  controls: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#0f172a",
  },
  roomLabel: { color: "#94a3b8", fontSize: 12, marginBottom: 8 },
  roomRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  roomChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  roomChipActive: { backgroundColor: "#fff" },
  roomChipText: { color: "#e2e8f0", fontSize: 14 },
  roomChipTextActive: { color: "#0f172a", fontWeight: "600" },
  error: { color: "#f87171", fontSize: 14, marginBottom: 8 },
  capture: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  captureDisabled: { opacity: 0.7 },
  captureText: { color: "#0f172a", fontSize: 16, fontWeight: "600" },
  back: { alignItems: "center" },
  backText: { color: "#94a3b8", fontSize: 14 },
  permissionText: { color: "#e2e8f0", textAlign: "center", marginBottom: 16 },
  button: { backgroundColor: "#fff", padding: 16, borderRadius: 8, marginBottom: 12 },
  buttonText: { color: "#0f172a", fontWeight: "600" },
  cancel: {},
  cancelText: { color: "#94a3b8" },
});
