import { CAPTURE_TIPS, GUIDED_SHOOT_SEQUENCE, getShootProgressLabel } from "./captureTips";
import { ROOM_LABELS } from "../types";

describe("captureTips", () => {
  it("GUIDED_SHOOT_SEQUENCE has five core rooms in listing order", () => {
    expect(GUIDED_SHOOT_SEQUENCE).toEqual([
      "living_room",
      "kitchen",
      "bedroom",
      "bathroom",
      "exterior",
    ]);
  });

  it("CAPTURE_TIPS has at least two tips per guided room", () => {
    for (const room of GUIDED_SHOOT_SEQUENCE) {
      expect(CAPTURE_TIPS[room].length).toBeGreaterThanOrEqual(2);
    }
  });

  it("getShootProgressLabel formats step counts", () => {
    expect(getShootProgressLabel(0, 5)).toBe("Room 1 of 5");
    expect(getShootProgressLabel(4, 5)).toBe("Room 5 of 5");
  });

  it("every guided room has a display label", () => {
    for (const room of GUIDED_SHOOT_SEQUENCE) {
      expect(ROOM_LABELS[room]).toBeTruthy();
    }
  });
});
