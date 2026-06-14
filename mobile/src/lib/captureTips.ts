import type { RoomType } from "../types";

/** Legacy default sequence when no capture brief is stored. */
export const GUIDED_SHOOT_SEQUENCE: RoomType[] = [
  "living_room",
  "kitchen",
  "bedroom",
  "bathroom",
  "exterior",
];

export const CAPTURE_TIPS: Record<RoomType, string[]> = {
  living_room: [
    "Stand in a corner and shoot diagonally across the room.",
    "Turn on lights and open curtains for even brightness.",
    "Keep the phone level — avoid tilted horizons.",
    "Hide bins, cables, and clutter at the edges of the frame.",
  ],
  kitchen: [
    "Shoot from the doorway or an opposite corner.",
    "Clear benches of dishes and personal items.",
    "Capture appliances and benchtops in one clean frame.",
    "Use overhead lights — avoid shooting into bright windows.",
  ],
  bedroom: [
    "Shoot from the doorway with the bed as the focal point.",
    "Straighten bedding and remove floor clutter.",
    "Open blinds slightly for soft natural light.",
    "Keep wardrobes closed unless showcasing storage.",
  ],
  bathroom: [
    "Shoot from the doorway — include vanity and shower if possible.",
    "Wipe mirrors and surfaces; remove toiletries from sight.",
    "Turn on the exhaust light for even illumination.",
    "Close the toilet lid before capturing.",
  ],
  exterior: [
    "Shoot in landscape orientation from street level.",
    "Step back to include the full facade and some sky.",
    "Avoid harsh midday sun when possible — morning or late afternoon is best.",
    "Trim distracting cars or bins from the frame if you can.",
  ],
  other: [
    "Hold the phone steady and keep the frame level.",
    "Use good lighting — turn on room lights if needed.",
    "Fill the frame with the feature you want to highlight.",
  ],
};

const SLOT_TIPS: Record<string, string[]> = {
  dining_room: [
    "Shoot from a corner to include table and surrounding space.",
    "Clear the table of clutter and personal items.",
    "Turn on overhead lights for even illumination.",
  ],
  study: [
    "Shoot from the doorway showing desk and storage.",
    "Tidy cables, papers, and personal items on the desk.",
    "Turn on desk or ceiling lights for a bright look.",
  ],
  laundry: [
    "Shoot from the doorway — include washer and bench if visible.",
    "Clear surfaces of laundry baskets and clutter.",
    "Turn on the room light for even brightness.",
  ],
  garage: [
    "Shoot from the driveway or doorway in landscape orientation.",
    "Tidy visible tools and storage boxes if possible.",
    "Open the garage door for natural light when safe.",
  ],
};

export function getTipsForSlot(slotId: string, roomType: RoomType): string[] {
  if (SLOT_TIPS[slotId]) return SLOT_TIPS[slotId];
  if (slotId.startsWith("bedroom")) return CAPTURE_TIPS.bedroom;
  if (slotId.startsWith("bathroom")) return CAPTURE_TIPS.bathroom;
  if (slotId.startsWith("exterior")) return CAPTURE_TIPS.exterior;
  return CAPTURE_TIPS[roomType] ?? CAPTURE_TIPS.other;
}

export function getShootProgressLabel(stepIndex: number, total: number): string {
  return `Room ${stepIndex + 1} of ${total}`;
}
