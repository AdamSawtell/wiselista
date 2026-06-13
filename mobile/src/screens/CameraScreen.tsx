import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import { ROOM_LABELS, ROOM_TYPES, type RoomType } from "../types";
import { CAPTURE_TIPS } from "../lib/captureTips";
import {
  estimateBrightnessFromBase64,
  getBrightnessHint,
  getBrightnessStatus,
} from "../lib/captureCoaching";
import { uploadJobPhoto } from "../lib/uploadPhoto";
import { useCaptureCoaching } from "../hooks/useCaptureCoaching";
import CaptureCoachingOverlay from "../components/CaptureCoachingOverlay";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FRAME_PADDING = 24;

export default function CameraScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: {
    params: {
      jobId: string;
      startSequence?: number;
      roomType?: RoomType;
      guided?: boolean;
      stepIndex?: number;
      propertyName?: string;
    };
  };
}) {
  const { user } = useAuth();
  const jobId = route.params.jobId;
  const guided = route.params.guided ?? false;
  const fixedRoom = route.params.roomType;
  const stepIndex = route.params.stepIndex ?? 0;
  const propertyName = route.params.propertyName;

  const [roomType, setRoomType] = useState<RoomType>(fixedRoom ?? "living_room");
  const [permission, requestPermission] = useCameraPermissions();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brightnessHint, setBrightnessHint] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const useWebFallback = Platform.OS === "web";
  const coaching = useCaptureCoaching(guided && !useWebFallback);

  useEffect(() => {
    if (fixedRoom) setRoomType(fixedRoom);
  }, [fixedRoom]);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) requestPermission();
  }, [permission]);

  async function processCapture(uri: string) {
    if (!user) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadJobPhoto(user.id, jobId, uri, roomType);
      if (guided) {
        navigation.replace("CapturePreview", {
          jobId,
          photoId: result.photoId,
          previewUri: uri,
          roomType,
          stepIndex,
          propertyName,
        });
        return;
      }
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleCapture() {
    if (!cameraRef.current || uploading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: true,
      });
      if (!photo?.uri) {
        setError("Failed to capture");
        return;
      }
      await processCapture(photo.uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed");
    }
  }

  async function handlePickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo library permission required");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    if (asset.base64) {
      const luma = estimateBrightnessFromBase64(asset.base64);
      if (luma != null) {
        setBrightnessHint(getBrightnessHint(getBrightnessStatus(luma)));
      }
    }
    await processCapture(asset.uri);
  }

  const tips = CAPTURE_TIPS[roomType].slice(0, 2);

  if (!useWebFallback && !permission) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.cameraBar }]}>
        <Text style={[styles.permissionText, { color: theme.colors.cameraBarText }]}>
          Requesting camera access…
        </Text>
      </View>
    );
  }

  if (!useWebFallback && !permission?.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.cameraBar }]}>
        <Text style={[styles.permissionText, { color: theme.colors.cameraBarText }]}>
          Camera access is required to capture property photos.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>Grant permission</Text>
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
      {useWebFallback ? (
        <View style={[styles.webFallback, { backgroundColor: theme.colors.cameraBar }]}>
          <Text style={[styles.webFallbackTitle, { color: theme.colors.cameraBarText }]}>
            Camera preview unavailable on web
          </Text>
          <Text style={[styles.webFallbackSub, { color: theme.colors.cameraBarMuted }]}>
            Choose a photo from your library to continue the guided shoot.
          </Text>
        </View>
      ) : (
        <>
          <CameraView ref={cameraRef} style={styles.camera} />
          {guided && (
            <CaptureCoachingOverlay
              rollDegrees={coaching.rollDegrees}
              tiltHint={coaching.tiltHint}
              isLevel={coaching.isLevel}
              sensorsAvailable={coaching.sensorsAvailable}
            />
          )}
        </>
      )}

      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.frame, { width: frameWidth, height: frameWidth * 0.75 }]}>
          <Text style={styles.frameLabel}>{ROOM_LABELS[roomType]}</Text>
          <View style={styles.frameGuide} />
        </View>
      </View>

      <View style={[styles.controls, { backgroundColor: theme.colors.cameraBar }]}>
        {guided && (
          <View style={styles.tipsRow}>
            {!useWebFallback && !coaching.isLevel && coaching.tiltHint && (
              <Text style={[styles.coachingLine, { color: theme.colors.primaryLight }]}>
                {coaching.tiltHint}
              </Text>
            )}
            {brightnessHint && (
              <Text style={[styles.coachingLine, { color: theme.colors.primaryLight }]}>
                {brightnessHint}
              </Text>
            )}
            {tips.map((tip) => (
              <Text key={tip} style={[styles.tipLine, { color: theme.colors.cameraBarMuted }]}>
                • {tip}
              </Text>
            ))}
          </View>
        )}

        {!guided && (
          <>
            <Text style={[styles.roomLabel, { color: theme.colors.cameraBarMuted }]}>Room type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomRow}>
              {ROOM_TYPES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roomChip, roomType === r && { backgroundColor: theme.colors.primary }]}
                  onPress={() => setRoomType(r)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.roomChipText,
                      { color: theme.colors.cameraBarText },
                      roomType === r && { color: theme.colors.textOnPrimary, fontWeight: "600" },
                    ]}
                  >
                    {ROOM_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}

        {useWebFallback ? (
          <TouchableOpacity
            style={[styles.capture, { backgroundColor: theme.colors.primary }, uploading && styles.captureDisabled]}
            onPress={handlePickFromLibrary}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <Text style={[styles.captureText, { color: theme.colors.textOnPrimary }]}>Choose photo</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.capture, { backgroundColor: theme.colors.primary }, uploading && styles.captureDisabled]}
            onPress={handleCapture}
            disabled={uploading}
            activeOpacity={0.9}
          >
            {uploading ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <Text style={[styles.captureText, { color: theme.colors.textOnPrimary }]}>Capture</Text>
            )}
          </TouchableOpacity>
        )}

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
  webFallback: { flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl },
  webFallbackTitle: { ...theme.typography.titleSmall, textAlign: "center", marginBottom: theme.spacing.sm },
  webFallbackSub: { ...theme.typography.body, textAlign: "center" },
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
  tipsRow: { marginBottom: theme.spacing.md },
  coachingLine: { ...theme.typography.captionMedium, marginBottom: theme.spacing.xs },
  tipLine: { ...theme.typography.caption, marginBottom: theme.spacing.xs },
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
