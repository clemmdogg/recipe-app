/**
 * Browsers only give motion data after asking permission inside a tap, and most computers have
 * no accelerometer, so the web version never listens. The "Surprise me" button does the same job.
 */
export function useShake(_onShake: () => void, _enabled: boolean): boolean {
  return false;
}
