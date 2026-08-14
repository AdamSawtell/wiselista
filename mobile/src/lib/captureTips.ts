import type { RoomType } from "../types";
import { getShotRecipe, recipeTipLines } from "./shotRecipes";

/** Legacy default sequence when no capture brief is stored. */
export const GUIDED_SHOOT_SEQUENCE: RoomType[] = [
  "living_room",
  "kitchen",
  "bedroom",
  "bathroom",
  "exterior",
];

export function getTipsForSlot(
  slotId: string,
  roomType: RoomType,
  templateId?: string | null
): string[] {
  return recipeTipLines(getShotRecipe(slotId, roomType, templateId));
}

export const CAPTURE_TIPS: Record<RoomType, string[]> = {
  living_room: getTipsForSlot("living_room", "living_room"),
  kitchen: getTipsForSlot("kitchen", "kitchen"),
  bedroom: getTipsForSlot("bedroom_1", "bedroom"),
  bathroom: getTipsForSlot("bathroom_1", "bathroom"),
  exterior: getTipsForSlot("exterior_front", "exterior", "house_3"),
  other: getTipsForSlot("other", "other"),
};

export function getShootProgressLabel(stepIndex: number, total: number): string {
  return `Room ${stepIndex + 1} of ${total}`;
}
