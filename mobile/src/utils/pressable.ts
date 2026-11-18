import type { PressableStateCallbackType } from 'react-native';

/**
 * Whether the mouse is over a Pressable. Only browsers report this (react-native-web adds
 * `hovered` to the state), so on phones it is always false and their design doesn't change.
 */
export function isHovered(state: PressableStateCallbackType): boolean {
  return 'hovered' in state && state.hovered === true;
}
