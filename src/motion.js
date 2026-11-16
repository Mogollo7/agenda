import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';

export function useReduceMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOn).catch(() => {});
    const s = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => s.remove();
  }, []);
  return on;
}
const safe = (f) => () => { try { f(); } catch {} };
export const hap = {
  tap: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  ok: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  err: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
