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
});
