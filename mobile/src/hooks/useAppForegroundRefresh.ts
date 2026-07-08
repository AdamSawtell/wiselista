import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/** Run callback when app returns from background (e.g. after Stripe Checkout). */
export function useAppForegroundRefresh(onForeground: () => void) {
  const appState = useRef(AppState.currentState);
  const callbackRef = useRef(onForeground);
  callbackRef.current = onForeground;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        callbackRef.current();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);
}
