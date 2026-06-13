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
import { APP_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import { ROOM_LABELS, type RoomType } from "../types";
import { GUIDED_SHOOT_SEQUENCE } from "../lib/captureTips";
import PrimaryButton from "../components/PrimaryButton";

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
  const isLast = stepIndex >= GUIDED_SHOOT_SEQUENCE.length - 1;

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.kicker, { color: theme.colors.primary }]}>Preview</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{ROOM_LABELS[roomType]}</Text>
      </View>

      <View style={styles.body}>
        <Image source={{ uri: previewUri }} style={[styles.preview, { borderColor: theme.colors.border }]} resizeMode="cover" />
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Check framing and lighting before continuing.
        </Text>

        <PrimaryButton
          label={isLast ? "Review shoot" : "Next room"}
          onPress={() => {
            if (isLast) {
              navigation.replace("ShootReview", { jobId, propertyName });
              return;
            }
            navigation.replace("GuidedShoot", {
              jobId,
              propertyName,
              stepIndex: stepIndex + 1,
            });
          }}
        />
        <PrimaryButton
          label={`Add another ${ROOM_LABELS[roomType].toLowerCase()} photo`}
          onPress={() =>
            navigation.replace("Camera", {
              jobId,
              roomType,
              guided: true,
              stepIndex,
              propertyName,
            })
          }
          variant="secondary"
        />
        {removing ? (
          <ActivityIndicator color={theme.colors.error} style={styles.retakeLoader} />
        ) : (
          <PrimaryButton label="Retake" onPress={handleRetake} variant="ghost" />
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
  retakeLoader: { marginTop: theme.spacing.md },
});
