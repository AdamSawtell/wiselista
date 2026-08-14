import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import { ROOM_LABELS, type RoomType } from "../types";
import { uploadJobPhoto } from "../lib/uploadPhoto";
import PrimaryButton from "../components/PrimaryButton";

export default function CapturePreviewScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: {
    params: {
      jobId: string;
      photoId?: string;
      previewUri: string;
      roomType: RoomType;
      briefSlotId?: string;
      slotLabel?: string;
      stepIndex: number;
      totalSteps?: number;
      propertyName?: string;
      templateId?: string;
      brightnessHint?: string | null;
      extraShot?: boolean;
    };
  };
}) {
  const { user } = useAuth();
  const {
    jobId,
    previewUri,
    roomType,
    stepIndex,
    propertyName,
    slotLabel,
    totalSteps,
    briefSlotId,
    templateId,
    brightnessHint,
    extraShot,
  } = route.params;
  const [saving, setSaving] = useState(false);
  const isLast = totalSteps != null ? stepIndex >= totalSteps - 1 : false;
  const lightingHold = Boolean(brightnessHint);

  function cameraParams(nextExtra: boolean) {
    return {
      jobId,
      roomType,
      briefSlotId: nextExtra ? undefined : briefSlotId,
      slotLabel,
      guided: true,
      stepIndex,
      totalSteps,
      propertyName,
      templateId,
      extraShot: nextExtra,
    };
  }

  async function savePhoto(asExtra: boolean) {
    if (!user) throw new Error("Sign in to save this photo.");
    return uploadJobPhoto(user.id, jobId, previewUri, roomType, {
      briefSlotId: asExtra ? null : briefSlotId ?? null,
    });
  }

  async function handleAccept() {
    setSaving(true);
    try {
      await savePhoto(Boolean(extraShot));
      if (isLast) {
        navigation.replace("ShootReview", { jobId, propertyName });
        return;
      }
      navigation.replace("GuidedShoot", {
        jobId,
        propertyName,
        stepIndex: extraShot ? stepIndex : stepIndex + 1,
      });
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleRetake() {
    navigation.replace("Camera", cameraParams(Boolean(extraShot)));
  }

  async function handleAddAnother() {
    setSaving(true);
    try {
      await savePhoto(Boolean(extraShot));
      navigation.replace("Camera", cameraParams(true));
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.kicker, { color: theme.colors.primary }]}>Preview</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {slotLabel ?? ROOM_LABELS[roomType]}
        </Text>
      </View>

      <View style={styles.body}>
        <Image source={{ uri: previewUri }} style={[styles.preview, { borderColor: theme.colors.border }]} resizeMode="cover" />
        {lightingHold ? (
          <Text style={[styles.hold, { color: theme.colors.warning }]}>{brightnessHint}</Text>
        ) : (
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Check framing and lighting before continuing.
          </Text>
        )}

        {saving ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.retakeLoader} />
        ) : (
          <>
            <PrimaryButton
              label={lightingHold ? "Use anyway" : isLast ? "Save and review" : "Save and next room"}
              onPress={() => void handleAccept()}
            />
            {!lightingHold && (
              <PrimaryButton
                label={`Add another ${ROOM_LABELS[roomType].toLowerCase()} photo`}
                onPress={() => void handleAddAnother()}
                variant="secondary"
              />
            )}
            <PrimaryButton label="Retake" onPress={handleRetake} variant="ghost" />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  kicker: { ...theme.typography.label, marginBottom: 4 },
  title: { ...theme.typography.title },
  body: { flex: 1, padding: theme.spacing.lg },
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  hint: { ...theme.typography.body, marginBottom: theme.spacing.lg },
  hold: { ...theme.typography.bodyMedium, marginBottom: theme.spacing.lg },
  retakeLoader: { marginTop: theme.spacing.md },
});
