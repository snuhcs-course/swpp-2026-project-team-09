/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type RefObject, useRef } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  TextInput,
  type View,
} from 'react-native';
import { space } from '@/design-system/tokens';

// The room kept under the field, above the keyboard.
const ROOM = space[4];

type Field = ReturnType<typeof TextInput.State.currentlyFocusedInput>;

export interface Reveal {
  // On the View that holds the scroll view's content: the field is measured against it.
  content: RefObject<View | null>;
  // On the scroll view: where it stands, how much of it is seen, and when either changes. A press on a button beside
  // the field, as 확인 or 보내기, goes through while the keyboard is up.
  scrollProps: {
    keyboardShouldPersistTaps: 'handled';
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onLayout: (event: LayoutChangeEvent) => void;
    onContentSizeChange: () => void;
    scrollEventThrottle: number;
  };
}

// While the keyboard is up, scrolls `scroll` so that the field being typed in stands above the bottom of what is seen
// of it, which the keyboard has made shorter: when what is seen shrinks for the keyboard, and when the content grows
// under the field, as a field of several lines or a message sent makes it. Android's scroll view does neither by
// itself. A field outside the content, such as one in a sheet, is left alone.
export function useRevealFocused(scroll: RefObject<ScrollView | null>, keyboardUp: boolean): Reveal {
  const content = useRef<View>(null);
  const offset = useRef(0);
  const seen = useRef(0);
  const reveal = (): void => {
    const field = TextInput.State.currentlyFocusedInput() as Field | null;
    const box = content.current;
    if (!keyboardUp || field === null || box === null) {
      return;
    }
    field.measureLayout(
      box,
      (_x, y, _width, height) => {
        const below = y + height + ROOM - (offset.current + seen.current);
        if (below > 0) {
          scroll.current?.scrollTo({ y: offset.current + below });
        }
      },
      () => {
        // The field is not in this scroll view.
      },
    );
  };
  return {
    content,
    scrollProps: {
      keyboardShouldPersistTaps: 'handled',
      onScroll: ({ nativeEvent }) => {
        offset.current = nativeEvent.contentOffset.y;
      },
      onLayout: ({ nativeEvent }) => {
        seen.current = nativeEvent.layout.height;
        reveal();
      },
      onContentSizeChange: reveal,
      scrollEventThrottle: 16,
    },
  };
}
