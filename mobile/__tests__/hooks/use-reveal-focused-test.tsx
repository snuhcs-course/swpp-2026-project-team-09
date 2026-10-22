/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, TextInput } from 'react-native';
import type { ScrollView, View } from 'react-native';

import { type Reveal, useRevealFocused } from '@/hooks/use-reveal-focused';

// The tests' phone has no native field to focus: the focused field is faked, standing at `y` in the content, `height`
// high, or outside the scroll view's content when `inside` is false.
interface FakeField {
  y: number;
  height: number;
  inside: boolean;
}

const SEEN = 300;
const ROOM = 16;

type Field = ReturnType<typeof TextInput.State.currentlyFocusedInput>;
type Measured = (x: number, y: number, width: number, height: number) => void;

let field: FakeField = { y: 0, height: 48, inside: true };
const scrollTo = jest.fn<void, [{ y: number }]>();

// The focused field as the hook asks it: where it stands in the content, or that it is not in it.
function fakeField(): Field {
  const stand = {
    measureLayout: (_box: unknown, ok: Measured, fail: () => void): void => {
      if (field.inside) {
        ok(0, field.y, 0, field.height);
      } else {
        fail();
      }
    },
  };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a stand-in for the focused native field
  return stand as unknown as Field;
}

beforeEach(() => {
  field = { y: 0, height: 48, inside: true };
  scrollTo.mockClear();
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockImplementation(fakeField);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function revealWith(keyboardUp: boolean): Promise<Reveal['scrollProps']> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only scrollTo is used
  const scroll = { current: { scrollTo } as unknown as ScrollView };
  const { result } = await renderHook(() => useRevealFocused(scroll, keyboardUp));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the field is measured against it by the fake
  result.current.content.current = {} as View;
  return result.current.scrollProps;
}

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only the height is read
const layout = (height: number): LayoutChangeEvent => ({ nativeEvent: { layout: { height } } }) as LayoutChangeEvent;

const scrolled = (y: number): NativeSyntheticEvent<NativeScrollEvent> =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only the offset is read
  ({ nativeEvent: { contentOffset: { x: 0, y } } }) as NativeSyntheticEvent<NativeScrollEvent>;

describe('useRevealFocused', () => {
  it('scrolls a field under what is seen to stand 16 above its bottom, once the view shrinks for the keyboard', async () => {
    field = { y: 400, height: 48, inside: true };
    const props = await revealWith(true);

    props.onLayout(layout(SEEN));

    expect(scrollTo).toHaveBeenCalledWith({ y: 400 + 48 + ROOM - SEEN });
  });

  it('counts how far the view is already scrolled', async () => {
    field = { y: 400, height: 48, inside: true };
    const props = await revealWith(true);

    props.onScroll(scrolled(100));
    props.onLayout(layout(SEEN));

    expect(scrollTo).toHaveBeenCalledWith({ y: 400 + 48 + ROOM - SEEN });
  });

  it('leaves a field already in view, a field outside the content, and everything while the keyboard is down', async () => {
    field = { y: 100, height: 48, inside: true };
    (await revealWith(true)).onLayout(layout(SEEN));

    field = { y: 400, height: 48, inside: false };
    (await revealWith(true)).onLayout(layout(SEEN));

    field = { y: 400, height: 48, inside: true };
    (await revealWith(false)).onLayout(layout(SEEN));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('follows the field as the content grows, as a message sent pushes it down', async () => {
    field = { y: 200, height: 48, inside: true };
    const props = await revealWith(true);
    props.onLayout(layout(SEEN));

    field = { y: 300, height: 48, inside: true };
    props.onContentSizeChange();

    expect(scrollTo).toHaveBeenCalledWith({ y: 300 + 48 + ROOM - SEEN });
  });
});

describe('useRevealFocused, while the User drags', () => {
  it('does not pull back a User who dragged the field out of view, until a drag leaves it in view again', async () => {
    field = { y: 200, height: 48, inside: true };
    const props = await revealWith(true);
    props.onLayout(layout(SEEN));

    props.onScrollBeginDrag();
    props.onScroll(scrolled(0));
    field = { y: 400, height: 48, inside: true };
    props.onScrollEndDrag();
    props.onContentSizeChange();
    expect(scrollTo).not.toHaveBeenCalled();

    props.onScrollBeginDrag();
    props.onScroll(scrolled(200));
    props.onMomentumScrollEnd();
    field = { y: 500, height: 48, inside: true };
    props.onContentSizeChange();
    expect(scrollTo).toHaveBeenCalledWith({ y: 200 + (500 + 48 + ROOM - (200 + SEEN)) });
  });
});
