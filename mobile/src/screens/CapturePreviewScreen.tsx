import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { APP_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import { ROOM_LABELS, type RoomType } from "../types";
import { GUIDED_SHOOT_SEQUENCE } from "../lib/captureTips";

export default function CapturePreviewScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: {
    params: {
      jobId: string;
      photoId: string;
      previewUri: string;
      roomType: RoomType;
      stepIndex: number;
      propertyName?: string;
    };
  };
}) {
  const { session } = useAuth();
  const { jobId, photoId, previewUri, roomType, stepIndex, propertyName } = route.params;
  const [removing, setRemoving] = useState(false);

  async function handleRetake() {
    if (!session?.access_token) return;
    setRemoving(true);
    try {
      const url = `${APP_URL.replace(/\/$/, "")}/api/jobs/${jobId}/photos/${photoId}`;
      await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      navigation.replace("Camera", {
        jobId,
        roomType,
        guided: true,
        stepIndex,
        propertyName,
      });
    } catch {
      Alert.alert("Error", "Could not remove photo. Try again.");
    } finally {
      setRemoving(false);
    }
  }

  function handleAddAnother() {
    navigation.replace("Camera", {
      jobId,
      roomType,
      guided: true,
      stepIndex,
      propertyName,
    });
  }

  function handleNextRoom() {
    const isLast = stepIndex >= GUIDED_SHOOT_SEQUENCE.length - 1;
    if (isLast) {
      navigation.replace("ShootReview", { jobId, propertyName });
      return;
    }
    navigation.replace("GuidedShoot", {
      jobId,
      propertyName,
      stepIndex: stepIndex + 1,
    });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Photo captured</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        {ROOM_LABELS[roomType]} — does this look good?
      </Text>

      <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
        onPress={handleNextRoom}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryBtnText}>
          {stepIndex >= GUIDED_SHOOT_SEQUENCE.length - 1 ? "Review shoot" : "Next room"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
        onPress={handleAddAnother}
        activeOpacity={0.8}
      >
        <Text style={[styles.secondaryBtnText, { color: theme.colors.textPrimary }]}>
          Add another {ROOM_LABELS[roomType].toLowerCase()} photo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.retakeBtn}
        onPress={handleRetake}
        disabled={removing}
        activeOpacity={0.8}
      >
        {removing ? (
          <ActivityIndicator color={theme.colors.error} />
        ) : (
          <Text style={[styles.retakeBtnText, { color: theme.colors.error }]}>Retake</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.xl },
  title: { ...theme.typography.title, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body, marginBottom: theme.spacing.lg },
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceMuted,
  },
  primaryBtn: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  primaryBtnText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
  secondaryBtn: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  secondaryBtnText: { ...theme.typography.bodyMedium },
  retakeBtn: { alignItems: "center", padding: theme.spacing.md },
  retakeBtnText: { ...theme.typography.bodyMedium },
});
