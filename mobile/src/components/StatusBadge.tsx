import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { JobStatus } from "../types";
import { STATUS_LABELS, getStatusStyle } from "../lib/jobStatus";

export default function StatusBadge({ status }: { status: JobStatus }) {
  const style = getStatusStyle(status);
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <View style={[styles.dot, { backgroundColor: style.dot }]} />
      <Text style={[styles.text, { color: style.text }]}>{STATUS_LABELS[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "600" },
});
