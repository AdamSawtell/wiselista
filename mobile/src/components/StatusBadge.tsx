import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { JobStatus } from "../types";
import { STATUS_LABELS, getStatusStyle } from "../lib/jobStatus";

export default function StatusBadge({ status }: { status: JobStatus }) {
  const style = getStatusStyle(status);
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{STATUS_LABELS[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
