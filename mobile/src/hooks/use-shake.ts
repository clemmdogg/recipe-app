import { useFocusEffect } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createShakeDetector } from '@/utils/shake';

const ReadingIntervalMs = 100;

/**
 * Calls `onShake` when the phone is shaken, using the accelerometer. It only listens while
 * `enabled` and the screen is in focus, so other tabs and a hidden app don't react.
 * Returns whether this device has an accelerometer.
 */
export function useShake(onShake: () => void, enabled: boolean): boolean {
  const [isAvailable, setIsAvailable] = useState(false);
  // Always calls the newest callback without restarting the sensor.
  const latestOnShake = useRef(onShake);
  useEffect(() => {
    latestOnShake.current = onShake;
  });

  useEffect(() => {
    let isCurrent = true;
    Accelerometer.isAvailableAsync()
      .then((available) => isCurrent && setIsAvailable(available))
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  const isListening = enabled && isAvailable;
  useFocusEffect(
    useCallback(() => {
      if (!isListening) {
        return undefined;
      }
      const isShake = createShakeDetector();
      Accelerometer.setUpdateInterval(ReadingIntervalMs);
      const subscription = Accelerometer.addListener((reading) => {
        if (isShake(reading, Date.now())) {
          latestOnShake.current();
        }
      });
      return () => subscription.remove();
    }, [isListening])
  );

  return isAvailable;
}
