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

export type CaptureBriefSlotView = {
  id: string;
  label: string;
  room_type: string;
  required: boolean;
  sequence: number;
};

export const CAPTURE_TIPS: Record<string, string[]> = {
  living_room: [
    "Stand in a corner and shoot diagonally across the room.",
    "Turn on all lights and open curtains for even brightness.",
    "Hold the phone level — keep horizons straight.",
    "Step back so you capture as much of the room as possible.",
  ],
  kitchen: [
    "Shoot from the doorway or an opposite corner.",
    "Clear benches of dishes, tea towels, and personal items.",
    "Turn on overhead lights — avoid shooting directly into windows.",
    "Include cupboards and benchtops in one wide shot.",
  ],
  bedroom: [
    "Shoot from the doorway with the bed as the focal point.",
    "Straighten bedding and remove floor clutter.",
    "Open blinds slightly for soft natural light.",
    "Make sure wardrobes and windows aren't cut off awkwardly.",
  ],
  bathroom: [
    "Shoot from the doorway — include vanity and shower if possible.",
    "Wipe mirrors and surfaces; hide toiletries and towels.",
    "Close the toilet lid and turn on the exhaust light.",
    "Keep the phone vertical unless the room is very wide.",
  ],
  exterior: [
    "Hold the phone in landscape (sideways) for front shots.",
    "Step back to include the full facade and some sky.",
    "Avoid harsh midday sun — morning or late afternoon is best.",
    "Check the letterbox and driveway are tidy in frame.",
  ],
  dining_room: [
    "Shoot from a corner to include table and surrounding space.",
    "Clear the table of clutter and personal items.",
    "Turn on overhead lights for even illumination.",
    "Open blinds slightly if the room feels dark.",
  ],
  study: [
    "Shoot from the doorway showing desk and storage.",
    "Tidy cables, papers, and personal items on the desk.",
    "Turn on desk or ceiling lights for a bright, inviting look.",
    "Keep the frame level and avoid shooting into windows.",
  ],
  laundry: [
    "Shoot from the doorway — include washer, dryer, and bench if visible.",
    "Clear surfaces of laundry baskets and clutter.",
    "Turn on the room light for even brightness.",
    "Close cupboard doors unless showcasing storage.",
  ],
  garage: [
    "Shoot from the driveway or doorway in landscape orientation.",
    "Tidy visible tools, bikes, and storage boxes if possible.",
    "Open the garage door for natural light when safe to do so.",
    "Include enough of the space to show size and access.",
  ],
  other: [
    "Hold the phone steady and keep the frame level.",
    "Turn on room lights for even brightness.",
    "Fill the frame with the feature you want to highlight.",
  ],
};

/** Tips for a brief slot — uses slot id for special rooms, room_type as fallback. */
export function getCaptureTipsForSlot(slot: CaptureBriefSlotView): string[] {
  if (slot.id === "dining_room" && CAPTURE_TIPS.dining_room) return CAPTURE_TIPS.dining_room;
  if (slot.id === "study" && CAPTURE_TIPS.study) return CAPTURE_TIPS.study;
  if (slot.id === "laundry" && CAPTURE_TIPS.laundry) return CAPTURE_TIPS.laundry;
  if (slot.id === "garage" && CAPTURE_TIPS.garage) return CAPTURE_TIPS.garage;
  if (slot.id.startsWith("bedroom")) return CAPTURE_TIPS.bedroom;
  if (slot.id.startsWith("bathroom")) return CAPTURE_TIPS.bathroom;
  if (slot.id.startsWith("exterior")) return CAPTURE_TIPS.exterior;
  return CAPTURE_TIPS[slot.room_type] ?? CAPTURE_TIPS.other;
}

/** Shown once before the room-by-room flow starts. */
export const CAPTURE_WELCOME_TIPS = [
  "Take one clear photo per room — your agent will professionally enhance them.",
  "Turn on lights and tidy visible surfaces before each shot.",
  "Hold the phone steady and keep shots level.",
  "You can skip rooms that aren't relevant and send when you're done.",
];

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
  slots: CaptureBriefSlotView[];
  filledSlotIds: string[];
  requiredSlotCount: number;
};

export function normalizeCaptureStatus(status: string | null | undefined): CaptureStatus {
  const valid: CaptureStatus[] = ["idle", "link_sent", "viewed", "in_progress", "submitted"];
  return valid.includes(status as CaptureStatus) ? (status as CaptureStatus) : "idle";
}

export function roomLabel(roomType: string): string {
  return ROOM_LABELS[roomType as keyof typeof ROOM_LABELS] ?? roomType;
}
