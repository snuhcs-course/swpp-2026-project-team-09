/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { useLayerScroll } from '@/screens/main/answer/held-height';

// A restaurant's menu over the list of candidates (P04 ticket 78, the user's words: "뒤로가기를 눌렀을 때, 이전 스크롤 위치로
// 돌아가면 좋을 것 같아"): the menu opens at its top, and closing it brings the list back where it was scrolled.
// Partitions: one menu opened and closed; one menu after another; the answer replaced while a menu is open; no layer;
// a place further down than the menu is tall, on the phone (P04 ticket 87).

const ANSWER = { id: 'answer' };
// The list's height and a menu's, as their layouts tell them.
const LIST = 1400;
const MENU = 380;

interface Props {
  layer: string | null;
  of: object | null;
  natural: number;
}

const FIRST: Props = { layer: null, of: ANSWER, natural: LIST };

async function scrolled(): Promise<{
  scroll: { current: { scrollTo: jest.Mock } };
  scrollY: { value: number };
  rerender: (props: Omit<Props, 'natural'>) => Promise<void>;
}> {
  const scroll = { current: { scrollTo: jest.fn() } };
  const scrollY = { value: 0 };
  const { rerender } = await renderHook(
    (props: Props) => {
      useLayerScroll(props.layer, props.of, scroll, scrollY, props.natural);
    },
    { initialProps: FIRST },
  );
  return {
    scroll,
    scrollY,
    rerender: async (props) => {
      await rerender({ ...props, natural: LIST });
    },
  };
}

// What shows of the content, which it scrolls no further than its end comes into.
const SHOWN = 150;

// The phone's scroll view, as Android runs it (`MountItemDispatcher`, "execute all ViewCommands first"): a scroll asked
// in an update runs before the views of that update are laid out, against the content as it stood, and stops where
// that content ends. Each update lays out `laid`, the content's own height, and the room the hook holds under it; the
// hook hears that height only in a later update, from the content's layout.
async function onPhone(scrolledTo: number): Promise<{
  update: (props: Props, laid: number) => Promise<void>;
  y: () => number;
}> {
  let content = LIST;
  let y = scrolledTo;
  const scrollY = { value: scrolledTo };
  const end = (): number => Math.max(0, content - SHOWN);
  const scroll = {
    current: {
      scrollTo: ({ y: to }: { y?: number }): void => {
        y = Math.min(to ?? 0, end());
        scrollY.value = y;
      },
    },
  };
  const { rerender, result } = await renderHook(
    (props: Props) => useLayerScroll(props.layer, props.of, scroll, scrollY, props.natural),
    { initialProps: FIRST },
  );
  return {
    update: async (props, laid) => {
      await rerender(props);
      const held: unknown = result.current;
      content = laid + (typeof held === 'number' ? held : 0);
      y = Math.min(y, end());
      scrollY.value = y;
    },
    y: () => y,
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

// Partitions: a place further down than the menu is tall; no layer. Expected values: the user's capture, the sixth of
// six places.
describe('a menu over the list, on the phone', () => {
  // The user's phone, 2026-11-26: back from the sixth of six places, the list came back near its top, where the
  // menu's own height had cut the way back short.
  it('brings back a place further down than the menu is tall, though the phone scrolls before it lays the list out', async () => {
    const phone = await onPhone(900);

    await phone.update({ layer: 'plan-6', of: ANSWER, natural: LIST }, MENU);
    expect(phone.y()).toBe(0);
    await phone.update({ layer: 'plan-6', of: ANSWER, natural: MENU }, MENU);

    await phone.update({ layer: null, of: ANSWER, natural: MENU }, LIST);
    await phone.update({ layer: null, of: ANSWER, natural: LIST }, LIST);
    expect(phone.y()).toBe(900);
  });

  it('holds no room under the content while no layer is open', async () => {
    const { result } = await renderHook(() =>
      useLayerScroll(null, ANSWER, { current: { scrollTo: jest.fn<void, []>() } }, { value: 0 }, LIST),
    );
    expect(result.current).toBe(0);
  });
});
