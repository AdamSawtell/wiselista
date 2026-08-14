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
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import { ROOM_LABELS, ROOM_TYPES, type RoomType } from "../types";
import { CAPTURE_TIPS } from "../lib/captureTips";
import { getShotRecipe } from "../lib/shotRecipes";
import {
  estimateBrightnessFromBase64,
  getBrightnessHint,
  getBrightnessStatus,
  getLiveCoach,
  shouldHoldForBrightness,
} from "../lib/captureCoaching";
import { uploadJobPhoto } from "../lib/uploadPhoto";
import { fileToPreviewUri, pickWebImage, readFileAsDataUrl } from "../lib/webCapture";
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
      briefSlotId?: string;
      slotLabel?: string;
      guided?: boolean;
      stepIndex?: number;
      totalSteps?: number;
      propertyName?: string;
      templateId?: string;
      extraShot?: boolean;
    };
  };
}) {
  const { user } = useAuth();
  const jobId = route.params.jobId;
  const guided = route.params.guided ?? false;
  const fixedRoom = route.params.roomType;
  const briefSlotId = route.params.briefSlotId;
  const slotLabel = route.params.slotLabel;
  const stepIndex = route.params.stepIndex ?? 0;
  const totalSteps = route.params.totalSteps;
  const propertyName = route.params.propertyName;
  const templateId = route.params.templateId ?? "house_3";
  const extraShot = route.params.extraShot ?? false;

  const [roomType, setRoomType] = useState<RoomType>(fixedRoom ?? "living_room");
  const [permission, requestPermission] = useCameraPermissions();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brightnessHint, setBrightnessHint] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const useWebFallback = Platform.OS === "web";
  const coaching = useCaptureCoaching(guided && !useWebFallback);
  const recipe = getShotRecipe(briefSlotId ?? roomType, roomType, templateId);
  const liveCoach = getLiveCoach({
    rollDegrees: coaching.rollDegrees,
    deviceHold: coaching.sensorsAvailable ? coaching.deviceHold : "portrait",
    wantsLandscape: recipe.orientation === "landscape",
    overlayLine: extraShot ? CAPTURE_TIPS[roomType][0] ?? recipe.overlayLine : recipe.overlayLine,
  });
  const webTips = extraShot ? CAPTURE_TIPS[roomType].slice(0, 2) : [recipe.overlayLine];

  useEffect(() => {
    if (fixedRoom) setRoomType(fixedRoom);
  }, [fixedRoom]);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) requestPermission();
  }, [permission]);

  async function processCapture(uri: string, brightnessHintNext: string | null) {
    if (guided) {
      navigation.replace("CapturePreview", {
        jobId,
        previewUri: uri,
        roomType,
        briefSlotId: extraShot ? undefined : briefSlotId,
        slotLabel,
        stepIndex,
        totalSteps,
        propertyName,
        templateId,
        brightnessHint: brightnessHintNext,
        extraShot,
      });
      return;
    }
    if (!user) {
      setError("Sign in to save this photo.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadJobPhoto(user.id, jobId, uri, roomType, {
        briefSlotId: briefSlotId ?? null,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function finishCapture(uri: string, base64?: string | null) {
    let hint: string | null = null;
    if (base64) {
      const luma = estimateBrightnessFromBase64(base64);
      if (luma != null) {
        const status = getBrightnessStatus(luma);
        hint = getBrightnessHint(status);
        setBrightnessHint(hint);
        if (!guided && shouldHoldForBrightness(status) && hint) {
          Alert.alert("Check lighting", hint, [
            { text: "Retake", style: "cancel" },
            { text: "Use anyway", onPress: () => void processCapture(uri, hint) },
          ]);
          return;
        }
      }
    }
    await processCapture(uri, hint);
  }

  async function handleWebFile(mode: "camera" | "library") {
    setError(null);
    setUploading(true);
    try {
      const file = await pickWebImage(mode);
      if (!file) {
        setUploading(false);
        return;
      }
      const uri = fileToPreviewUri(file);
      let base64: string | undefined;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      } catch {
        base64 = undefined;
      }
      await finishCapture(uri, base64);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not keep that photo. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCapture(force = false) {
    if (!force && liveCoach.holdShutter) return;
    if (!cameraRef.current || uploading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
        skipProcessing: true,
      });
      if (!photo?.uri) {
        setError("Failed to capture");
        return;
      }
      await finishCapture(photo.uri, photo.base64);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed");
    }
  }

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
            {slotLabel ?? ROOM_LABELS[roomType]}
          </Text>
          <Text style={[styles.webFallbackSub, { color: theme.colors.cameraBarMuted }]}>
            Take the photo, then check it here before we save it.
          </Text>
        </View>
      ) : (
        <>
          <CameraView ref={cameraRef} style={styles.camera} />
          {guided && (
            <CaptureCoachingOverlay
              rollDegrees={coaching.rollDegrees}
              coach={liveCoach}
              sensorsAvailable={coaching.sensorsAvailable}
            />
          )}
        </>
      )}

      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.frame, { width: frameWidth, height: frameWidth * 0.75 }]}>
          <Text style={styles.frameLabel}>{slotLabel ?? ROOM_LABELS[roomType]}</Text>
          <View style={styles.frameGuide} />
        </View>
      </View>

      <View style={[styles.controls, { backgroundColor: theme.colors.cameraBar }]}>
        {guided && useWebFallback && (
          <View style={styles.tipsRow}>
            {webTips.map((tip) => (
              <Text key={tip} style={[styles.tipLine, { color: theme.colors.cameraBarMuted }]}>
                {tip}
              </Text>
            ))}
          </View>
        )}
        {brightnessHint && (
          <Text style={[styles.coachingLine, { color: theme.colors.primaryLight }]}>
            {brightnessHint}
          </Text>
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
          <>
            <TouchableOpacity
              style={[styles.capture, { backgroundColor: theme.colors.primary }, uploading && styles.captureDisabled]}
              onPress={() => void handleWebFile("camera")}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={theme.colors.textOnPrimary} />
              ) : (
                <Text style={[styles.captureText, { color: theme.colors.textOnPrimary }]}>Take photo</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.libraryBtn, uploading && styles.captureDisabled]}
              onPress={() => void handleWebFile("library")}
              disabled={uploading}
            >
              <Text style={[styles.libraryBtnText, { color: theme.colors.cameraBarMuted }]}>
                Choose from library
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[
              styles.capture,
              { backgroundColor: theme.colors.primary },
              (uploading || liveCoach.holdShutter) && styles.captureDisabled,
            ]}
            onPress={() => void handleCapture(false)}
            disabled={uploading || liveCoach.holdShutter}
            activeOpacity={0.9}
          >
            {uploading ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} />
            ) : (
              <Text style={[styles.captureText, { color: theme.colors.textOnPrimary }]}>
                {liveCoach.holdShutter ? "Level the phone" : "Capture"}
              </Text>
            )}
          </TouchableOpacity>
          {liveCoach.holdShutter && !uploading && (
            <TouchableOpacity style={styles.libraryBtn} onPress={() => void handleCapture(true)}>
              <Text style={[styles.libraryBtnText, { color: theme.colors.cameraBarMuted }]}>
                Capture anyway
              </Text>
            </TouchableOpacity>
          )}
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
  libraryBtn: { alignItems: "center", marginBottom: theme.spacing.md },
  libraryBtnText: { ...theme.typography.captionMedium },
  back: { alignItems: "center" },
  backText: { ...theme.typography.caption },
  permissionText: { ...theme.typography.body, textAlign: "center", marginBottom: theme.spacing.md },
  button: { padding: theme.spacing.md, borderRadius: theme.radius.sm, marginBottom: theme.spacing.md },
  buttonText: { ...theme.typography.bodyMedium },
  cancel: {},
  cancelText: {},
});
