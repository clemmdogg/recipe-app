import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Calls `reload` when the screen comes back into focus, e.g. after closing a modal or switching
 * tabs, so it shows changes made elsewhere. Skips the first focus, when the data is already loading.
 */
export function useReloadOnRefocus(reload: () => void): void {
  const hasFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) {
        reload();
      } else {
        hasFocused.current = true;
      }
    }, [reload])
  );
}
