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
import { ROOM_VISUALS } from "../lib/roomVisuals";
import StepDots from "../components/StepDots";
import PrimaryButton from "../components/PrimaryButton";

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
  const visual = ROOM_VISUALS[currentRoom];
  const isLastStep = stepIndex >= totalSteps - 1;
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.navigate("JobDetail", { jobId })}>
          <Text style={[styles.headerLink, { color: theme.colors.primary }]}>Exit</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {propertyName ?? "Property shoot"}
        </Text>
        <View style={[styles.countPill, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Text style={[styles.headerCount, { color: theme.colors.textPrimary }]}>{photoCount}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.progressLabel, { color: theme.colors.textMuted }]}>
          {getShootProgressLabel(stepIndex, totalSteps)}
        </Text>
        <StepDots total={totalSteps} current={stepIndex} accent={visual.accent} />
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: visual.accent }]} />
        </View>

        <View style={[styles.roomHero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.roomIconWrap, { backgroundColor: `${visual.accent}22` }]}>
            <Text style={styles.roomEmoji}>{visual.emoji}</Text>
          </View>
          <Text style={[styles.roomTitle, { color: theme.colors.textPrimary }]}>{ROOM_LABELS[currentRoom]}</Text>
          <Text style={[styles.roomHint, { color: theme.colors.textSecondary }]}>
            Frame this room, then capture one or more photos.
          </Text>
        </View>

        <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.tipsTitle, { color: theme.colors.textPrimary }]}>Photographer tips</Text>
          {tips.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Text style={[styles.tipCheck, { color: visual.accent }]}>✓</Text>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton label="Take photo" onPress={openCamera} style={styles.captureBtn} />

        <PrimaryButton label={isLastStep ? "Skip and review" : "Skip this room"} onPress={skipRoom} variant="ghost" />

        {photoCount > 0 && (
          <PrimaryButton
            label={`Finish shoot · ${photoCount} photo${photoCount === 1 ? "" : "s"}`}
            onPress={() => navigation.navigate("ShootReview", { jobId, propertyName })}
            variant="secondary"
            style={[styles.finishBtn, { borderColor: theme.colors.success }]}
          />
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
  countPill: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  headerCount: { ...theme.typography.captionMedium, fontWeight: "700" },
  content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  progressLabel: { ...theme.typography.caption, marginBottom: theme.spacing.sm, textAlign: "center" },
  progressTrack: { height: 4, borderRadius: theme.radius.full, overflow: "hidden", marginBottom: theme.spacing.xl },
  progressFill: { height: "100%", borderRadius: theme.radius.full },
  roomHero: {
    alignItems: "center",
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  roomIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  roomEmoji: { fontSize: 36 },
  roomTitle: { ...theme.typography.title, marginBottom: theme.spacing.xs, textAlign: "center" },
  roomHint: { ...theme.typography.body, textAlign: "center" },
  tipsCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.xl,
  },
  tipsTitle: { ...theme.typography.bodyMedium, marginBottom: theme.spacing.md },
  tipRow: { flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  tipCheck: { ...theme.typography.bodyMedium, lineHeight: 22 },
  tipText: { ...theme.typography.body, flex: 1, lineHeight: 22 },
  captureBtn: { marginBottom: theme.spacing.sm },
  finishBtn: { marginTop: theme.spacing.md },
});
