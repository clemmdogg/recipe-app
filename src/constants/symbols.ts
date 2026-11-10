import { MaterialSymbols_400Regular_Filled } from '@expo-google-fonts/material-symbols/400Regular_Filled';
import type { SymbolViewProps } from 'expo-symbols';

/**
 * Pass as `weight` to `SymbolView` to draw a filled icon.
 *
 * On Android and web, SymbolView draws Material Symbols with an outlined font, so names like
 * `favorite` render as outlines. This switches to the filled font. iOS ignores it; use
 * `.fill` SF Symbols there (e.g. `heart.fill`).
 */
export const FilledSymbolWeight: SymbolViewProps['weight'] = {
  ios: 'regular',
  android: { name: 'MaterialSymbols_400Regular_Filled', font: MaterialSymbols_400Regular_Filled },
};
