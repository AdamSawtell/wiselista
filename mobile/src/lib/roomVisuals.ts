import type { RoomType } from "../types";

export const ROOM_VISUALS: Record<RoomType, { emoji: string; accent: string }> = {
  living_room: { emoji: "🛋️", accent: "#818cf8" },
  kitchen: { emoji: "🍳", accent: "#fbbf24" },
  bedroom: { emoji: "🛏️", accent: "#a78bfa" },
  bathroom: { emoji: "🚿", accent: "#38bdf8" },
  exterior: { emoji: "🏡", accent: "#34d399" },
  other: { emoji: "📷", accent: "#94a3b8" },
};
