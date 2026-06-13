import type { RoomType } from "../types";

/** Default room order for a guided property shoot (hero → supporting rooms → exterior). */
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

export function getShootProgressLabel(stepIndex: number, total: number): string {
  return `Room ${stepIndex + 1} of ${total}`;
}
