import { useWindowDimensions } from 'react-native';

import { MaxPageWidth, Spacing, WideLayoutBreakpoint } from '@/constants/theme';

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

export type PageFrame = {
  paddingLeft: number;
  paddingRight: number;
  /** The width left for content between the paddings. */
  contentWidth: number;
};

/**
 * Side paddings for a page `width` wide (measured with onLayout): at least Spacing.three plus the
 * safe area, and more on wide screens, so the content is at most `maxWidth` wide and centered.
 */
export function getPageFrame(
  width: number,
  safeArea: { left: number; right: number },
  maxWidth: number = MaxPageWidth
): PageFrame {
  const available = Math.max(0, width - safeArea.left - safeArea.right - 2 * Spacing.three);
  const contentWidth = Math.min(available, maxWidth);
  const extra = Spacing.three + (available - contentWidth) / 2;
  return { paddingLeft: safeArea.left + extra, paddingRight: safeArea.right + extra, contentWidth };
}

/**
 * How many columns of at least `minItemWidth` fit in `contentWidth`, and how wide each one is.
 * Items get a fixed width, so a lone item in the last row isn't stretched.
 */
export function getGrid(
  contentWidth: number,
  { minItemWidth, gap, maxColumns }: { minItemWidth: number; gap: number; maxColumns: number }
): { columns: number; itemWidth: number } {
  const fitting = Math.floor((contentWidth + gap) / (minItemWidth + gap));
  const columns = Math.max(1, Math.min(maxColumns, fitting));
  return { columns, itemWidth: (contentWidth - gap * (columns - 1)) / columns };
}
