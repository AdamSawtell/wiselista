import {
  estimateBrightnessFromBase64,
  getBrightnessHint,
  getBrightnessStatus,
  getDeviceHold,
  getLiveCoach,
  getRollDegrees,
  getTiltHint,
  getTiltStatus,
  shouldHoldForBrightness,
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

    it("holds upload when dark or bright", () => {
      expect(shouldHoldForBrightness("dark")).toBe(true);
      expect(shouldHoldForBrightness("bright")).toBe(true);
      expect(shouldHoldForBrightness("ok")).toBe(false);
    });

    it("estimates luma from base64", () => {
      const luma = estimateBrightnessFromBase64("AAAA");
      expect(luma).toBe(0);
    });
  });

  describe("live coach", () => {
    it("treats y-dominant gravity as portrait and x-dominant as landscape", () => {
      expect(getDeviceHold(0.1, -0.95)).toBe("portrait");
      expect(getDeviceHold(0.9, -0.2)).toBe("landscape");
    });

    it("holds shutter and shows tilt on a portrait room", () => {
      const coach = getLiveCoach({
        rollDegrees: 12,
        deviceHold: "portrait",
        wantsLandscape: false,
        overlayLine: "1× · corner wide",
      });
      expect(coach.kind).toBe("tilt");
      expect(coach.holdShutter).toBe(true);
      expect(coach.message).toMatch(/left/i);
    });

    it("shows the recipe line when level on a portrait room", () => {
      const coach = getLiveCoach({
        rollDegrees: 1,
        deviceHold: "portrait",
        wantsLandscape: false,
        overlayLine: "1× · corner wide",
      });
      expect(coach.kind).toBe("ok");
      expect(coach.holdShutter).toBe(false);
      expect(coach.message).toBe("1× · corner wide");
    });

    it("asks to rotate for landscape recipes and ignores portrait tilt hold", () => {
      const coach = getLiveCoach({
        rollDegrees: 20,
        deviceHold: "portrait",
        wantsLandscape: true,
        overlayLine: "1× landscape · facade",
      });
      expect(coach.kind).toBe("rotate");
      expect(coach.holdShutter).toBe(false);
      expect(coach.message).toMatch(/sideways/i);
    });

    it("does not apply portrait tilt hold once the phone is sideways", () => {
      const coach = getLiveCoach({
        rollDegrees: 80,
        deviceHold: "landscape",
        wantsLandscape: true,
        overlayLine: "1× landscape · facade",
      });
      expect(coach.kind).toBe("ok");
      expect(coach.holdShutter).toBe(false);
      expect(coach.message).toBe("1× landscape · facade");
    });
  });
});
