/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { useLayerScroll } from '@/screens/main/answer/held-height';

// A restaurant's menu over the list of candidates (P04 ticket 78, the user's words: "뒤로가기를 눌렀을 때, 이전 스크롤 위치로
// 돌아가면 좋을 것 같아"): the menu opens at its top, and closing it brings the list back where it was scrolled.
// Partitions: one menu opened and closed; one menu after another; the answer replaced while a menu is open; no layer.

const ANSWER = { id: 'answer' };

interface Props {
  layer: string | null;
  of: object | null;
}

const FIRST: Props = { layer: null, of: ANSWER };

async function scrolled(): Promise<{
  scroll: { current: { scrollTo: jest.Mock } };
  scrollY: { value: number };
  rerender: (props: Props) => Promise<void>;
}> {
  const scroll = { current: { scrollTo: jest.fn() } };
  const scrollY = { value: 0 };
  const { rerender } = await renderHook(
    (props: Props) => {
      useLayerScroll(props.layer, props.of, scroll, scrollY);
    },
    { initialProps: FIRST },
  );
  return {
    scroll,
    scrollY,
    rerender: async (props) => {
      await rerender(props);
    },
  };
}

describe('a menu over the list', () => {
  it('opens at its top, and closing it brings the list back to where it was scrolled', async () => {
    const { scroll, scrollY, rerender } = await scrolled();
    scrollY.value = 180;

    await rerender({ layer: 'plan-3', of: ANSWER });
    expect(scroll.current.scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
    scrollY.value = 40;

    await rerender({ layer: null, of: ANSWER });
    expect(scroll.current.scrollTo).toHaveBeenLastCalledWith({ y: 180, animated: false });
  });

  it("opens another place's menu at its top too, and closing it brings back the list's place", async () => {
    const { scroll, scrollY, rerender } = await scrolled();
    scrollY.value = 260;
    await rerender({ layer: 'plan-3', of: ANSWER });
    scrollY.value = 90;

    await rerender({ layer: 'plan-1', of: ANSWER });
    expect(scroll.current.scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });

    await rerender({ layer: null, of: ANSWER });
    expect(scroll.current.scrollTo).toHaveBeenLastCalledWith({ y: 260, animated: false });
  });

  it('keeps no place for another answer: it starts where a new answer does', async () => {
    const { scroll, scrollY, rerender } = await scrolled();
    scrollY.value = 180;
    await rerender({ layer: 'plan-3', of: ANSWER });
    scroll.current.scrollTo.mockClear();

    await rerender({ layer: null, of: { id: 'recalculated' } });
    expect(scroll.current.scrollTo).not.toHaveBeenCalled();
  });

  it('moves nothing while no layer opens or closes', async () => {
    const { scroll, scrollY, rerender } = await scrolled();
    scrollY.value = 180;

    await rerender({ layer: null, of: ANSWER });
    expect(scroll.current.scrollTo).not.toHaveBeenCalled();
  });
});
