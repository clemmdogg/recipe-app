import { useWindowDimensions } from 'react-native';

import { WideLayoutBreakpoint } from '@/constants/theme';

export type Layout = {
  width: number;
  height: number;
  /** Enough room for multi-column or side-by-side layouts. */
  isWide: boolean;
  isLandscape: boolean;
  /** Columns for card grids: 2 on a portrait phone, up to 5 on a landscape tablet. */
  gridColumns: number;
};

const MinGridCardWidth = 190;
const MinGridColumns = 2;
const MaxGridColumns = 5;

export function getLayout(width: number, height: number): Layout {
  return {
    width,
    height,
    isWide: width >= WideLayoutBreakpoint,
    isLandscape: width > height,
    gridColumns: Math.min(
      MaxGridColumns,
      Math.max(MinGridColumns, Math.floor(width / MinGridCardWidth))
    ),
  };
}

/** Layout info for the current window; updates on rotation and iPad split view resizing. */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return getLayout(width, height);
}
