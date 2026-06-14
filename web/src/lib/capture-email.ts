import { formatJobDateShort } from "@/lib/jobs";

export type CaptureEmailInput = {
  captureUrl: string;
  projectName: string;
  propertyAddress?: string | null;
  expiresAt?: string | null;
  agentName?: string | null;
  agentAgency?: string | null;
  customerEmail?: string | null;
};

function listingLabel(input: CaptureEmailInput): string {
  const address = input.propertyAddress?.trim();
  if (address) return address;
  return input.projectName.trim() || "the property";
}

export function buildCaptureEmailSubject(input: CaptureEmailInput): string {
  const label = listingLabel(input);
  return `Listing photos needed — ${label}`;
}

export function buildCaptureEmailBody(input: CaptureEmailInput): string {
  const label = listingLabel(input);
  const lines = [
    "Hi,",
    "",
    `Please use this link on your phone to take listing photos for ${label}. It walks you through each room step by step — no account or app install needed.`,
    "",
    input.captureUrl,
  ];

  if (input.expiresAt) {
    lines.push("", `This link expires on ${formatJobDateShort(input.expiresAt)}.`);
  }

  lines.push("", "If anything looks unclear on your phone, reply to this email and I’ll help.");
  lines.push("");

  const agentName = input.agentName?.trim();
  const agentAgency = input.agentAgency?.trim();
  if (agentName) {
    lines.push("Thanks,", agentName);
    if (agentAgency) lines.push(agentAgency);
  } else {
    lines.push("Thanks");
  }

  return lines.join("\r\n");
}

export function buildCaptureMailtoUrl(input: CaptureEmailInput): string {
  const to = input.customerEmail?.trim() ?? "";
  // encodeURIComponent (not URLSearchParams) — many mail clients show + as literal plus signs.
  const subject = encodeURIComponent(buildCaptureEmailSubject(input));
  const body = encodeURIComponent(buildCaptureEmailBody(input));
  const query = `subject=${subject}&body=${body}`;
  return to ? `mailto:${to}?${query}` : `mailto:?${query}`;
}
