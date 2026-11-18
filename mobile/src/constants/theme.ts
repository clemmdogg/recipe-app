/**
 * The app's colors in light and dark mode: warm creams, sands and browns with a terracotta
 * accent, chosen to feel calm and family-friendly. Text colors keep a contrast of at least 4.5:1
 * (WCAG AA) against the backgrounds they are used on.
 */

import '@/global.css';

import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2B2118',
    background: '#FFFBF5',
    backgroundElement: '#F5EDE3',
    backgroundSelected: '#EADFD2',
    textSecondary: '#6E6259',
    /** Main actions (the primary button), today's day and the selected tab. */
    accent: '#B5512B',
    /** Text and icons on top of `accent`. */
    onAccent: '#FFFFFF',
    /** Saved-recipe heart. */
    favorite: '#D94A45',
    /** Error messages, e.g. a wrong password. */
    error: '#B42318',
  },
  dark: {
    text: '#F7EFE6',
    background: '#1C1714',
    backgroundElement: '#2A231E',
    backgroundSelected: '#3A302A',
    textSecondary: '#C2B5A8',
    accent: '#F08A5D',
    onAccent: '#1C1714',
    favorite: '#FF7A70',
    error: '#FF8A80',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Headers and screen backgrounds drawn by the navigation library, in the app's colors. */
export const NavigationThemes: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.accent,
      background: Colors.light.background,
      card: Colors.light.background,
      text: Colors.light.text,
      border: Colors.light.backgroundSelected,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.accent,
      background: Colors.dark.background,
      card: Colors.dark.background,
      text: Colors.dark.text,
      border: Colors.dark.backgroundSelected,
    },
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
/** Window width (in points) from which a layout counts as "wide": tablets, landscape phones, wide iPad split views. */
export const WideLayoutBreakpoint = 600;

/**
 * The widest a page with grids or columns (Plan, List, Pantry) gets. On wider screens it is
 * centered, so nothing is stretched across a big monitor. Reading content stays at MaxContentWidth.
 */
export const MaxPageWidth = 1200;

/** In a browser at least this wide, the tabs become a sidebar on the left (app-tabs.web.tsx). */
export const WebSidebarBreakpoint = 768;
