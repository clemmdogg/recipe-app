/** "system" follows the phone's own light or dark mode. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** Personal settings, stored only on this device and never synced. */
export type DeviceSettings = {
  theme: ThemePreference;
  /** Shaking the phone on the Recipes tab opens a random recipe. */
  shakeForRecipe: boolean;
};

export const DefaultDeviceSettings: DeviceSettings = {
  theme: 'system',
  shakeForRecipe: true,
};
