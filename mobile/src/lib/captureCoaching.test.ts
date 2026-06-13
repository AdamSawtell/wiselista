import {
  estimateBrightnessFromBase64,
  getBrightnessHint,
  getBrightnessStatus,
  getRollDegrees,
  getTiltHint,
  getTiltStatus,
} from "./captureCoaching";

describe("captureCoaching", () => {
  describe("getRollDegrees", () => {
    it("returns 0 when phone is upright", () => {
      expect(getRollDegrees(0, -1)).toBeCloseTo(0, 1);
    });

    it("returns positive roll when tilted right", () => {
      expect(getRollDegrees(0.2, -1)).toBeGreaterThan(5);
    });
  });

  describe("getTiltHint", () => {
    it("returns null when level", () => {
      expect(getTiltHint(2)).toBeNull();
      expect(getTiltStatus(2)).toBe("level");
    });

    it("suggests left correction when rolled right", () => {
      expect(getTiltHint(12)).toMatch(/left/i);
    });

    it("suggests right correction when rolled left", () => {
      expect(getTiltHint(-12)).toMatch(/right/i);
    });
  });

  describe("brightness", () => {
    it("flags dark scenes", () => {
      expect(getBrightnessStatus(40)).toBe("dark");
      expect(getBrightnessHint("dark")).toMatch(/dark/i);
    });

    it("returns null hint for ok brightness", () => {
      expect(getBrightnessHint("ok")).toBeNull();
    });

    it("estimates luma from base64", () => {
      const luma = estimateBrightnessFromBase64("AAAA");
      expect(luma).toBe(0);
    });
  });
});
