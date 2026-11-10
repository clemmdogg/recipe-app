import { useCallback, useEffect, useEffectEvent, useState } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export type AsyncResource<T> = {
  status: AsyncStatus;
  /** Latest data for the current key. Kept while reloading so lists don't flash empty. */
  data: T | undefined;
  error: Error | undefined;
  reload: () => void;
};

type Settled<T> = {
  key: string;
  attempt: number;
  data: T | undefined;
  error: Error | undefined;
};

/**
 * Loads data for `key` and reloads whenever the key changes. Pass `null` to load nothing.
 * Stale requests are aborted, so a slow old response can't overwrite a newer one.
 */
export function useAsyncResource<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>
): AsyncResource<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const runLoad = useEffectEvent(load);

  useEffect(() => {
    if (key === null) {
      return;
    }
    const controller = new AbortController();
    runLoad(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setSettled({ key, attempt, data, error: undefined });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled((previous) => ({
            key,
            attempt,
            data: previous?.key === key ? previous.data : undefined,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      }
    );
    return () => controller.abort();
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  if (key === null) {
    return { status: 'idle', data: undefined, error: undefined, reload };
  }
  const sameKey = settled?.key === key;
  const isCurrent = sameKey && settled.attempt === attempt;
  return {
    status: !isCurrent ? 'loading' : settled.error ? 'error' : 'success',
    data: sameKey ? settled.data : undefined,
    error: isCurrent ? settled.error : undefined,
    reload,
  };
}
