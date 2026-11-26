/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { useHideTabBarOnMain, useTabBarHiddenOnMain } from '@/screens/shell/main-tab-bar';

// Partitions: no hider, one hider, two hiders of which one leaves or stops asking, and both leaving.
describe('the tab bar on the main screen', () => {
  it('is shown while nothing asks it to give way', async () => {
    const shown = await renderHook(() => useTabBarHiddenOnMain());
    await renderHook(() => {
      useHideTabBarOnMain(false);
    });

    expect(shown.result.current).toBe(false);
  });

  it('stays hidden while one asker is left, when the other leaves or stops asking', async () => {
    const shown = await renderHook(() => useTabBarHiddenOnMain());
    const frame = await renderHook(() => {
      useHideTabBarOnMain(true);
    });
    const panel = await renderHook(
      ({ open }: { open: boolean }) => {
        useHideTabBarOnMain(open);
      },
      { initialProps: { open: true } },
    );
    expect(shown.result.current).toBe(true);

    await panel.rerender({ open: false });
    expect(shown.result.current).toBe(true);

    await panel.rerender({ open: true });
    await frame.unmount();
    expect(shown.result.current).toBe(true);

    await panel.unmount();
    expect(shown.result.current).toBe(false);
  });
});
