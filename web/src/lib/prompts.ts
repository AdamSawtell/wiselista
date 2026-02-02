/**
 * AI editing prompts — one place to maintain. No "coded prompt every time".
 * Used when sending a job for AI review: pick default or room-specific prompt per photo.
 */

export type RoomType =
  | "living_room"
  | "kitchen"
  | "bedroom"
  | "bathroom"
  | "exterior"
  | "other";

/** Default prompt for any property photo (used if no room-specific prompt). */
export const DEFAULT_EDIT_PROMPT =
  "Enhance this property photo for a real estate listing. Improve lighting, color balance, and clarity. Keep the scene realistic and suitable for rental or sale listings. Do not add or remove major elements.";

/** Optional per-room prompts — same structure every time, tune wording here. */
export const ROOM_EDIT_PROMPTS: Partial<Record<RoomType, string>> = {
  living_room:
    "Enhance this living room photo for a property listing. Optimize natural light and warmth, improve color balance. Keep the space realistic and inviting.",
  kitchen:
    "Enhance this kitchen photo for a property listing. Improve lighting and clarity, make surfaces and fixtures look clean and appealing. Keep it realistic.",
  bedroom:
    "Enhance this bedroom photo for a property listing. Soft, inviting light and neutral tones. Keep the space realistic and suitable for listings.",
  bathroom:
    "Enhance this bathroom photo for a property listing. Improve brightness and clarity, make tiles and fixtures look clean. Keep it realistic.",
  exterior:
    "Enhance this exterior property photo for a listing. Improve sky and landscaping visibility, natural lighting. Keep the building and surroundings realistic.",
  other:
    "Enhance this property photo for a real estate listing. Improve lighting and presentation. Keep the scene realistic.",
};

/**
 * Get the prompt to send to the AI for a given room type.
 * One place to edit — no prompt coded per job.
 */
export function getEditPrompt(roomType: RoomType): string {
  return ROOM_EDIT_PROMPTS[roomType] ?? DEFAULT_EDIT_PROMPT;
}
