import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Accelerometer } from "expo-sensors";
import {
  getDeviceHold,
  getRollDegrees,
  getTiltHint,
  getTiltStatus,
  type DeviceHold,
  type TiltStatus,
} from "../lib/captureCoaching";

const UPDATE_MS = 120;
const LEVEL_THRESHOLD = 5;

export function useCaptureCoaching(enabled: boolean) {
  const [rollDegrees, setRollDegrees] = useState(0);
  const [accel, setAccel] = useState({ x: 0, y: -1 });
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
        setAccel({ x, y });
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
  const deviceHold: DeviceHold = getDeviceHold(accel.x, accel.y);

  return {
    rollDegrees,
    tiltStatus,
    tiltHint,
    isLevel: tiltStatus === "level",
    deviceHold,
    sensorsAvailable: available,
  };
}
