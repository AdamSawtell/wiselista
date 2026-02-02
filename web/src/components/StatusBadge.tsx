type Status = "draft" | "submitted" | "payment_pending" | "processing" | "ready" | "failed";

const statusClass: Record<Status, string> = {
  draft: "badge-draft",
  submitted: "badge-submitted",
  payment_pending: "badge-payment_pending",
  processing: "badge-processing",
  ready: "badge-ready",
  failed: "badge-failed",
};

const statusLabel: Record<Status, string> = {
  draft: "Draft",
  submitted: "Submitted",
  payment_pending: "Awaiting payment",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  const cls = statusClass[s] ?? "badge-draft";
  const label = statusLabel[s] ?? status;
  return <span className={cls}>{label}</span>;
}
