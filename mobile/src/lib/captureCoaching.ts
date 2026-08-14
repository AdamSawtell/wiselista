/** Roll in degrees when the phone is held in portrait (camera facing subject). */
export function getRollDegrees(x: number, y: number): number {
  return (Math.atan2(x, -y) * 180) / Math.PI;
}

export type TiltStatus = "level" | "tilted";

export function getTiltStatus(rollDegrees: number, threshold = 5): TiltStatus {
  return Math.abs(rollDegrees) <= threshold ? "level" : "tilted";
}

export function getTiltHint(rollDegrees: number, threshold = 5): string | null {
  const status = getTiltStatus(rollDegrees, threshold);
  if (status === "level") return null;
  if (rollDegrees > threshold) return "Tilt phone left to level the horizon";
  return "Tilt phone right to level the horizon";
}

export type DeviceHold = "portrait" | "landscape";

/** Gravity-dominant axis. Works while the UI stays portrait-locked. */
export function getDeviceHold(x: number, y: number): DeviceHold {
  return Math.abs(x) > Math.abs(y) ? "landscape" : "portrait";
}

export type LiveCoachKind = "tilt" | "rotate" | "ok";

export type LiveCoach = {
  kind: LiveCoachKind;
  message: string;
  holdShutter: boolean;
  showLevelLine: boolean;
};

export function getLiveCoach(input: {
  rollDegrees: number;
  deviceHold: DeviceHold;
  wantsLandscape: boolean;
  overlayLine: string;
  threshold?: number;
}): LiveCoach {
  const threshold = input.threshold ?? 5;

  if (input.wantsLandscape) {
    if (input.deviceHold !== "landscape") {
      return {
        kind: "rotate",
        message: "Rotate the phone sideways",
        holdShutter: false,
        showLevelLine: false,
      };
    }
    return {
      kind: "ok",
      message: input.overlayLine,
      holdShutter: false,
      showLevelLine: false,
    };
  }

  const tiltHint = getTiltHint(input.rollDegrees, threshold);
  if (tiltHint) {
    return {
      kind: "tilt",
      message: tiltHint,
      holdShutter: true,
      showLevelLine: true,
    };
  }

  return {
    kind: "ok",
    message: input.overlayLine,
    holdShutter: false,
    showLevelLine: true,
  };
}

/** Average luma 0–255 from base64 JPEG/PNG data URI or raw base64. */
export function estimateBrightnessFromBase64(base64: string): number | null {
  const raw = base64.includes(",") ? base64.split(",")[1]! : base64;
  if (!raw) return null;
  try {
    const binary = atob(raw);
    const samples: number[] = [];
    const step = Math.max(1, Math.floor(binary.length / 800));
    for (let i = 0; i < binary.length; i += step) {
      samples.push(binary.charCodeAt(i));
    }
    if (samples.length === 0) return null;
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  } catch {
    return null;
  }
}

export type BrightnessStatus = "ok" | "dark" | "bright";

export function getBrightnessStatus(luma: number): BrightnessStatus {
  if (luma < 70) return "dark";
  if (luma > 200) return "bright";
  return "ok";
}

export function getBrightnessHint(status: BrightnessStatus): string | null {
  if (status === "dark") return "Room looks dark — turn on lights or open curtains";
  if (status === "bright") return "Scene may be overexposed — avoid shooting into windows";
  return null;
}

export function shouldHoldForBrightness(status: BrightnessStatus): boolean {
  return status === "dark" || status === "bright";
}
