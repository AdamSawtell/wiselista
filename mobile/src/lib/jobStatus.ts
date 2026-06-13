import type { JobStatus } from "../types";
import { theme } from "../theme";

export const STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  payment_pending: "Payment due",
  processing: "Enhancing",
  ready: "Ready",
  failed: "Failed",
};

export function getStatusStyle(status: JobStatus): { bg: string; text: string; dot: string } {
  switch (status) {
    case "ready":
      return { bg: "rgba(34, 197, 94, 0.15)", text: theme.colors.success, dot: theme.colors.success };
    case "processing":
    case "submitted":
    case "payment_pending":
      return { bg: "rgba(59, 130, 246, 0.15)", text: theme.colors.primaryLight, dot: theme.colors.primary };
    case "failed":
      return { bg: "rgba(239, 68, 68, 0.15)", text: theme.colors.error, dot: theme.colors.error };
    default:
      return { bg: "rgba(148, 163, 184, 0.12)", text: theme.colors.textMuted, dot: theme.colors.textMuted };
  }
}
