import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../theme";
import { getTipsForSlot } from "../lib/captureTips";
import {
  orderedSlots,
  resolveCaptureBrief,
  type CaptureBriefSlot,
} from "../lib/captureBrief";
import StepDots from "../components/StepDots";
import PrimaryButton from "../components/PrimaryButton";

function stepLabel(index: number, total: number): string {
  const n = String(index + 1).padStart(2, "0");
  const t = String(total).padStart(2, "0");
  return `${n} / ${t}`;
}

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
  const [slots, setSlots] = useState<CaptureBriefSlot[]>([]);
  const [loadingBrief, setLoadingBrief] = useState(true);

  const totalSteps = slots.length || 1;
  const currentSlot = slots[stepIndex];
  const tips = currentSlot ? getTipsForSlot(currentSlot.id, currentSlot.room_type) : [];
  const isLastStep = stepIndex >= totalSteps - 1;

  async function loadBriefAndCount() {
    if (!user) return;
    setLoadingBrief(true);
    const [{ data: job }, { count }] = await Promise.all([
      supabase.from("jobs").select("capture_brief").eq("id", jobId).single(),
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("job_id", jobId),
    ]);
    setSlots(orderedSlots(resolveCaptureBrief(job?.capture_brief)));
    setPhotoCount(count ?? 0);
    setLoadingBrief(false);
  }

  useFocusEffect(
    useCallback(() => {
      void loadBriefAndCount();
    }, [jobId, user?.id])
  );

  function openCamera() {
    if (!currentSlot) return;
    navigation.navigate("Camera", {
      jobId,
      roomType: currentSlot.room_type,
      briefSlotId: currentSlot.id,
      slotLabel: currentSlot.label,
      guided: true,
      stepIndex,
      totalSteps,
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

  if (loadingBrief) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

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
        <Text style={[styles.stepLabel, { color: theme.colors.primary }]}>{stepLabel(stepIndex, totalSteps)}</Text>
        <StepDots total={totalSteps} current={stepIndex} />

        <Text style={[styles.roomTitle, { color: theme.colors.textPrimary }]}>
          {currentSlot?.label ?? "Room"}
        </Text>
        {!currentSlot?.required && (
          <Text style={[styles.optionalTag, { color: theme.colors.textMuted }]}>Optional</Text>
        )}
        <Text style={[styles.roomHint, { color: theme.colors.textSecondary }]}>
          Capture this room, then continue to the next.
        </Text>

        <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.tipsTitle, { color: theme.colors.textPrimary }]}>Before you shoot</Text>
          {tips.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={[styles.tipDash, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton label="Take photo" onPress={openCamera} style={styles.captureBtn} />
        <PrimaryButton
          label={isLastStep ? "Skip to review" : "Skip room"}
          onPress={skipRoom}
          variant="ghost"
        />

        {photoCount > 0 && (
          <PrimaryButton
            label={`Finish · ${photoCount} photo${photoCount === 1 ? "" : "s"}`}
            onPress={() => navigation.navigate("ShootReview", { jobId, propertyName })}
            variant="outline"
            style={styles.finishBtn}
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
  headerLink: { ...theme.typography.captionMedium, minWidth: 36 },
  headerTitle: { ...theme.typography.bodyMedium, flex: 1 },
  headerCount: { ...theme.typography.caption, minWidth: 64, textAlign: "right" },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  stepLabel: { ...theme.typography.label, marginBottom: theme.spacing.sm },
  roomTitle: { ...theme.typography.titleLarge, marginBottom: theme.spacing.xs },
  optionalTag: { ...theme.typography.caption, marginBottom: theme.spacing.xs },
  roomHint: { ...theme.typography.body, marginBottom: theme.spacing.lg },
  tipsCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.xl,
  },
  tipsTitle: { ...theme.typography.captionMedium, marginBottom: theme.spacing.md, textTransform: "uppercase", letterSpacing: 0.8 },
  tipRow: { flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.sm, alignItems: "flex-start" },
  tipDash: { width: 3, height: 16, marginTop: 3, borderRadius: 1 },
  tipText: { ...theme.typography.body, flex: 1 },
  captureBtn: { marginBottom: theme.spacing.xs },
  finishBtn: { marginTop: theme.spacing.md },
});
