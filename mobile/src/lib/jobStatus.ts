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

export function getStatusStyle(status: JobStatus): { bg: string; text: string } {
  switch (status) {
    case "ready":
      return { bg: theme.colors.successMuted, text: theme.colors.success };
    case "processing":
    case "submitted":
    case "payment_pending":
      return { bg: theme.colors.primaryMuted, text: theme.colors.primary };
    case "failed":
      return { bg: theme.colors.errorMuted, text: theme.colors.error };
    default:
      return { bg: theme.colors.surfaceMuted, text: theme.colors.textMuted };
  }
}
