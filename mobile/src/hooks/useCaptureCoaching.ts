import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";
import { getRollDegrees, getTiltHint, getTiltStatus, type TiltStatus } from "../lib/captureCoaching";

const UPDATE_MS = 120;
const LEVEL_THRESHOLD = 5;

export function useCaptureCoaching(enabled: boolean) {
  const [rollDegrees, setRollDegrees] = useState(0);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") {
      setAvailable(false);
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let mounted = true;

    void (async () => {
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (!mounted) return;
      setAvailable(isAvailable);
      if (!isAvailable) return;

      Accelerometer.setUpdateInterval(UPDATE_MS);
      subscription = Accelerometer.addListener(({ x, y }) => {
        setRollDegrees(getRollDegrees(x, y));
      });
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [enabled]);

  const tiltStatus: TiltStatus = getTiltStatus(rollDegrees, LEVEL_THRESHOLD);
  const tiltHint = getTiltHint(rollDegrees, LEVEL_THRESHOLD);

  return {
    rollDegrees,
    tiltStatus,
    tiltHint,
    isLevel: tiltStatus === "level",
    sensorsAvailable: available,
  };
}
