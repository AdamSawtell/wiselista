import { ROOM_LABELS } from "@/lib/jobs";

export type ListingType = "rent" | "sale";

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  rent: "For rent",
  sale: "For sale",
};

export const PORTAL_OPTIONS = [
  { value: "realestate_com_au", label: "realestate.com.au" },
  { value: "domain_com_au", label: "Domain" },
  { value: "trademe", label: "Trade Me Property" },
  { value: "rent_com_au", label: "Rent.com.au" },
  { value: "crm", label: "My CRM / portal" },
  { value: "other", label: "Other" },
] as const;

export type PortalValue = (typeof PORTAL_OPTIONS)[number]["value"];

export function getPortalLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return PORTAL_OPTIONS.find((p) => p.value === value)?.label ?? value;
}

/** Human-readable summary of Claid operations applied (operations-only API). */
export function getEnhancementSummary(roomType: string): string {
  const label = ROOM_LABELS[roomType] ?? roomType;
  const extras: Partial<Record<string, string>> = {
    exterior: "Extra contrast and saturation for curb appeal.",
    kitchen: "Neutral tones for clean benchtops and fixtures.",
    bathroom: "Bright, clean finish on tiles and surfaces.",
    living_room: "Warm exposure boost for inviting spaces.",
  };
  const extra = extras[roomType] ? ` ${extras[roomType]}` : "";
  return `HDR, exposure, sharpness, and smart upscale (${label} preset).${extra}`;
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return "under a second";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} second${totalSec === 1 ? "" : "s"}`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (sec === 0) return `${min} minute${min === 1 ? "" : "s"}`;
  return `${min}m ${sec}s`;
}

export function listingFilename(sequence: number, roomType: string, ext = "jpg"): string {
  const num = String(sequence).padStart(2, "0");
  const slug = roomType.replace(/_/g, "-");
  return `${num}-${slug}.${ext}`;
}
