import { useCallback } from "react";

export type HapticStyle = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

const PATTERNS: Record<HapticStyle, number | number[]> = {
  selection: 10,
  light: 12,
  medium: 25,
  heavy: 45,
  success: [10, 40, 15],
  warning: [30, 40, 30],
  error: [40, 50, 40, 50, 40],
};

/**
 * Hook providing subtle vibration / haptic feedback for mobile navigation and interactive controls.
 * Falls back safely and gracefully on devices or browsers without navigator.vibrate.
 */
export function useHaptic() {
  const trigger = useCallback((style: HapticStyle = "selection") => {
    try {
      if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
        const pattern = PATTERNS[style] ?? 10;
        navigator.vibrate(pattern);
      }
    } catch {
      // Gracefully ignore on unsupported devices / if permissions blocked
    }
  }, []);

  return { trigger };
}

export function triggerHaptic(style: HapticStyle = "selection") {
  try {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      const pattern = PATTERNS[style] ?? 10;
      navigator.vibrate(pattern);
    }
  } catch {}
}
