import { SymbolView } from 'expo-symbols';

import { FilledSymbolWeight } from '@/constants/symbols';
import { useTheme } from '@/hooks/use-theme';

type HeartIconProps = {
  filled: boolean;
  size?: number;
  /** Color of the empty heart. A filled heart always uses the theme's `favorite` color. */
  outlineColor?: string;
};

export function HeartIcon({ filled, size = 24, outlineColor }: HeartIconProps) {
  const theme = useTheme();

  return (
    <SymbolView
      // SymbolView only loads its font on mount (Android/web), so remount when switching fonts.
      key={filled ? 'filled' : 'outline'}
      name={{ ios: filled ? 'heart.fill' : 'heart', android: 'favorite', web: 'favorite' }}
      weight={filled ? FilledSymbolWeight : undefined}
      size={size}
      tintColor={filled ? theme.favorite : (outlineColor ?? theme.text)}
    />
  );
}
