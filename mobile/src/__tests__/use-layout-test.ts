import { getGrid, getLayout, getPageFrame } from '@/hooks/use-layout';

describe('getLayout', () => {
  it('treats a portrait phone as compact', () => {
    expect(getLayout(390, 844)).toMatchObject({ isWide: false, isLandscape: false });
  });

  it('treats a landscape phone as wide', () => {
    expect(getLayout(844, 390)).toMatchObject({ isWide: true, isLandscape: true });
  });

  it('treats a portrait tablet as wide', () => {
    expect(getLayout(820, 1180)).toMatchObject({ isWide: true, isLandscape: false });
  });

  it('treats a narrow iPad split view as compact', () => {
    expect(getLayout(320, 1180)).toMatchObject({ isWide: false });
  });

  it('switches to wide exactly at the breakpoint', () => {
    expect(getLayout(599, 900).isWide).toBe(false);
    expect(getLayout(600, 900).isWide).toBe(true);
  });

  it('uses two grid columns on a portrait phone, even a narrow one', () => {
    expect(getLayout(390, 844).gridColumns).toBe(2);
    expect(getLayout(320, 568).gridColumns).toBe(2);
  });

  it('adds grid columns as the window gets wider', () => {
    expect(getLayout(844, 390).gridColumns).toBe(4);
    expect(getLayout(820, 1180).gridColumns).toBe(4);
  });

  it('caps the grid at five columns', () => {
    expect(getLayout(1366, 1024).gridColumns).toBe(5);
  });
});

describe('getPageFrame', () => {
  const noSafeArea = { left: 0, right: 0 };

  it('keeps the normal side padding on a phone', () => {
    expect(getPageFrame(390, noSafeArea)).toEqual({ paddingLeft: 16, paddingRight: 16, contentWidth: 358 });
  });

  it('centers the content at its maximum width on a big screen', () => {
    expect(getPageFrame(1632, noSafeArea, 1200)).toEqual({ paddingLeft: 216, paddingRight: 216, contentWidth: 1200 });
  });

  it('adds the safe area on the side of a notch', () => {
    expect(getPageFrame(844, { left: 47, right: 0 }, 1200)).toMatchObject({ paddingLeft: 63, paddingRight: 16 });
  });
});

describe('getGrid', () => {
  it('fits as many columns as allowed, sharing the width', () => {
    expect(getGrid(1200, { minItemWidth: 280, gap: 12, maxColumns: 7 })).toEqual({ columns: 4, itemWidth: 291 });
  });

  it('uses one column when even two would be too narrow', () => {
    expect(getGrid(358, { minItemWidth: 280, gap: 12, maxColumns: 7 }).columns).toBe(1);
  });

  it('never goes above the maximum number of columns', () => {
    expect(getGrid(3000, { minItemWidth: 260, gap: 8, maxColumns: 4 }).columns).toBe(4);
  });
});
