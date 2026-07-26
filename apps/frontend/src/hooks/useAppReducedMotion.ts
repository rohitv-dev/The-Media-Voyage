import { useReducedMotion as useOSReducedMotion } from "motion/react";
import { useReducedMotionPreference } from "./useReducedMotionPreference";

/**
 * Whether animations should be reduced: true if the OS prefers reduced
 * motion OR the user turned on the in-app "Reduce motion" setting.
 */
export function useAppReducedMotion(): boolean {
  const osReduced = useOSReducedMotion();
  const [preferReduced] = useReducedMotionPreference();

  return Boolean(osReduced) || preferReduced;
}
