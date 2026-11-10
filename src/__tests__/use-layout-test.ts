import { getLayout } from '@/hooks/use-layout';

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
