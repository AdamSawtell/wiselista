import { ROOM_LABELS } from "@/lib/jobs";

export const CAPTURE_LINK_TTL_DAYS = 14;

export const GUIDED_CAPTURE_SEQUENCE = [
  "living_room",
  "kitchen",
  "bedroom",
  "bathroom",
  "exterior",
] as const;

export type GuidedRoomType = (typeof GUIDED_CAPTURE_SEQUENCE)[number];

export const CAPTURE_TIPS: Record<string, string[]> = {
  living_room: [
    "Stand in a corner and shoot diagonally across the room.",
    "Turn on lights and open curtains for even brightness.",
    "Keep the phone level — avoid tilted horizons.",
  ],
  kitchen: [
    "Shoot from the doorway or an opposite corner.",
    "Clear benches of dishes and personal items.",
    "Use overhead lights — avoid shooting into bright windows.",
  ],
  bedroom: [
    "Shoot from the doorway with the bed as the focal point.",
    "Straighten bedding and remove floor clutter.",
    "Open blinds slightly for soft natural light.",
  ],
  bathroom: [
    "Shoot from the doorway — include vanity and shower if possible.",
    "Wipe mirrors and surfaces; remove toiletries from sight.",
    "Close the toilet lid before capturing.",
  ],
  exterior: [
    "Shoot in landscape orientation from street level.",
    "Step back to include the full facade and some sky.",
    "Avoid harsh midday sun when possible.",
  ],
};

export type CaptureStatus = "idle" | "link_sent" | "viewed" | "in_progress" | "submitted";

export const CAPTURE_STATUS_LABELS: Record<CaptureStatus, string> = {
  idle: "Not set up",
  link_sent: "Link ready — waiting for customer",
  viewed: "Customer opened the link",
  in_progress: "Customer is taking photos",
  submitted: "Customer sent photos",
};

export type CaptureSession = {
  jobId: string;
  propertyName: string;
  propertyAddress: string | null;
  planTier: string;
  captureStatus: CaptureStatus;
  photoCount: number;
  maxPhotos: number;
  agentName: string;
  agentAgency: string | null;
  alreadySubmitted: boolean;
};

export function normalizeCaptureStatus(status: string | null | undefined): CaptureStatus {
  const valid: CaptureStatus[] = ["idle", "link_sent", "viewed", "in_progress", "submitted"];
  return valid.includes(status as CaptureStatus) ? (status as CaptureStatus) : "idle";
}

export function roomLabel(roomType: string): string {
  return ROOM_LABELS[roomType as keyof typeof ROOM_LABELS] ?? roomType;
}
