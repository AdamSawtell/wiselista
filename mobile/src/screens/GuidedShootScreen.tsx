import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import { ROOM_LABELS, type RoomType } from "../types";
import { CAPTURE_TIPS, GUIDED_SHOOT_SEQUENCE, getShootProgressLabel } from "../lib/captureTips";

export default function GuidedShootScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: {
    params: {
      jobId: string;
      propertyName?: string;
      stepIndex?: number;
    };
  };
}) {
  const { user } = useAuth();
  const jobId = route.params.jobId;
  const propertyName = route.params.propertyName;
  const stepIndex = route.params.stepIndex ?? 0;
  const [photoCount, setPhotoCount] = useState(0);

  const totalSteps = GUIDED_SHOOT_SEQUENCE.length;
  const currentRoom: RoomType = GUIDED_SHOOT_SEQUENCE[stepIndex] ?? "other";
  const tips = CAPTURE_TIPS[currentRoom];
  const isLastStep = stepIndex >= totalSteps - 1;

  async function refreshPhotoCount() {
    if (!user) return;
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId);
    setPhotoCount(count ?? 0);
  }

  useFocusEffect(
    useCallback(() => {
      void refreshPhotoCount();
    }, [jobId, user?.id])
  );

  function openCamera() {
    navigation.navigate("Camera", {
      jobId,
      roomType: currentRoom,
      guided: true,
      stepIndex,
      propertyName,
    });
  }

  function skipRoom() {
    if (isLastStep) {
      navigation.navigate("ShootReview", { jobId, propertyName });
      return;
    }
    navigation.replace("GuidedShoot", {
      jobId,
      propertyName,
      stepIndex: stepIndex + 1,
    });
  }

  function finishShoot() {
    navigation.navigate("ShootReview", { jobId, propertyName });
  }

  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.navigate("JobDetail", { jobId })}>
          <Text style={[styles.headerLink, { color: theme.colors.primary }]}>Exit</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {propertyName ?? "Property shoot"}
        </Text>
        <Text style={[styles.headerCount, { color: theme.colors.textMuted }]}>{photoCount} photos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.progressLabel, { color: theme.colors.textMuted }]}>
          {getShootProgressLabel(stepIndex, totalSteps)}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.colors.primary }]} />
        </View>

        <Text style={[styles.roomTitle, { color: theme.colors.textPrimary }]}>
          {ROOM_LABELS[currentRoom]}
        </Text>
        <Text style={[styles.roomHint, { color: theme.colors.textSecondary }]}>
          Follow the tips below, then capture one or more photos of this room.
        </Text>

        <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface }, theme.shadow]}>
          <Text style={[styles.tipsTitle, { color: theme.colors.textPrimary }]}>Capture tips</Text>
          {tips.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Text style={[styles.tipBullet, { color: theme.colors.primary }]}>•</Text>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.captureBtn, { backgroundColor: theme.colors.primary }]}
          onPress={openCamera}
          activeOpacity={0.9}
        >
          <Text style={styles.captureBtnText}>Take photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={skipRoom} activeOpacity={0.8}>
          <Text style={[styles.skipBtnText, { color: theme.colors.textMuted }]}>
            {isLastStep ? "Skip and review" : "Skip this room"}
          </Text>
        </TouchableOpacity>

        {photoCount > 0 && (
          <TouchableOpacity
            style={[styles.finishBtn, { borderColor: theme.colors.success }]}
            onPress={finishShoot}
            activeOpacity={0.8}
          >
            <Text style={[styles.finishBtnText, { color: theme.colors.success }]}>
              Finish shoot ({photoCount} photo{photoCount === 1 ? "" : "s"})
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    gap: theme.spacing.sm,
  },
  headerLink: { ...theme.typography.captionMedium },
  headerTitle: { ...theme.typography.bodyMedium, flex: 1 },
  headerCount: { ...theme.typography.caption },
  content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  progressLabel: { ...theme.typography.caption, marginBottom: theme.spacing.sm },
  progressTrack: { height: 6, borderRadius: theme.radius.full, overflow: "hidden", marginBottom: theme.spacing.xl },
  progressFill: { height: "100%", borderRadius: theme.radius.full },
  roomTitle: { ...theme.typography.title, marginBottom: theme.spacing.sm },
  roomHint: { ...theme.typography.body, marginBottom: theme.spacing.lg },
  tipsCard: { padding: theme.spacing.lg, borderRadius: theme.radius.md, marginBottom: theme.spacing.xl },
  tipsTitle: { ...theme.typography.bodyMedium, marginBottom: theme.spacing.md },
  tipRow: { flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  tipBullet: { ...theme.typography.body, lineHeight: 22 },
  tipText: { ...theme.typography.body, flex: 1, lineHeight: 22 },
  captureBtn: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  captureBtnText: { color: theme.colors.textOnPrimary, ...theme.typography.bodyMedium },
  skipBtn: { alignItems: "center", marginBottom: theme.spacing.lg },
  skipBtnText: { ...theme.typography.captionMedium },
  finishBtn: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    borderWidth: 1,
  },
  finishBtnText: { ...theme.typography.bodyMedium },
});
