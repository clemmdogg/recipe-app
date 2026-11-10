import { useWindowDimensions } from 'react-native';

import { WideLayoutBreakpoint } from '@/constants/theme';

export type Layout = {
  width: number;
  height: number;
  /** Enough room for multi-column or side-by-side layouts. */
  isWide: boolean;
  isLandscape: boolean;
};

export function getLayout(width: number, height: number): Layout {
  return {
    width,
    height,
    isWide: width >= WideLayoutBreakpoint,
    isLandscape: width > height,
  };
}

/** Layout info for the current window; updates on rotation and iPad split view resizing. */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return getLayout(width, height);
}
