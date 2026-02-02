/**
 * Basic unit tests for shared types and constants.
 * Run with: npx jest src/types.test.ts (after npm install --save-dev jest @types/jest --legacy-peer-deps)
 */
import { ROOM_LABELS, ROOM_TYPES, type RoomType } from "./types";

describe("types", () => {
  it("ROOM_TYPES includes all room keys", () => {
    expect(ROOM_TYPES).toContain("living_room");
    expect(ROOM_TYPES).toContain("kitchen");
    expect(ROOM_TYPES).toContain("bedroom");
    expect(ROOM_TYPES).toContain("bathroom");
    expect(ROOM_TYPES).toContain("exterior");
    expect(ROOM_TYPES).toContain("other");
    expect(ROOM_TYPES).toHaveLength(6);
  });

  it("ROOM_LABELS has a label for each room type", () => {
    const rooms: RoomType[] = ["living_room", "kitchen", "bedroom", "bathroom", "exterior", "other"];
    rooms.forEach((r) => {
      expect(ROOM_LABELS[r]).toBeDefined();
      expect(typeof ROOM_LABELS[r]).toBe("string");
      expect(ROOM_LABELS[r].length).toBeGreaterThan(0);
    });
  });

  it("ROOM_LABELS matches expected display names", () => {
    expect(ROOM_LABELS.living_room).toBe("Living room");
    expect(ROOM_LABELS.kitchen).toBe("Kitchen");
    expect(ROOM_LABELS.other).toBe("Other");
  });
});
