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
  // On the scroll view: where it stands, how much of it is seen, when either changes, and the User's drags. A press on
  // a button beside the field, as 확인 or 보내기, goes through while the keyboard is up.
  scrollProps: {
    keyboardShouldPersistTaps: 'handled';
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onScrollBeginDrag: () => void;
    onScrollEndDrag: () => void;
    onMomentumScrollEnd: () => void;
    onLayout: (event: LayoutChangeEvent) => void;
    onContentSizeChange: () => void;
    scrollEventThrottle: number;
  };
}

// How far the focused field's bottom, with its room, stands below what is seen of the scroll view, 0 or less while it
// is in view, given to `then`. Nothing is given without a field, or for a field outside `box`, the view's content.
function measureBelow(box: View | null, seenBottom: number, then: (below: number) => void): void {
  const field = TextInput.State.currentlyFocusedInput() as Field | null;
  if (field === null || box === null) {
    return;
  }
  field.measureLayout(
    box,
    (_x, y, _width, height) => {
      then(y + height + ROOM - seenBottom);
    },
    () => {
      // The field is not in this scroll view.
    },
  );
}

// While the keyboard is up, scrolls `scroll` so that the field being typed in stands above the bottom of what is seen
// of it, which the keyboard has made shorter. Android's scroll view does not by itself. It does so when what is seen
// shrinks for the keyboard, and when the content grows, as a field of several lines or a message sent makes it, unless
// the User dragged the field out of view to read: a message arriving then does not pull them back, until a drag leaves
// the field in view again. A field outside the content, such as one in a sheet, is left alone.
export function useRevealFocused(scroll: RefObject<ScrollView | null>, keyboardUp: boolean): Reveal {
  const content = useRef<View>(null);
  const offset = useRef(0);
  const seen = useRef(0);
  const following = useRef(true);
  const measure = (then: (below: number) => void): void => {
    if (keyboardUp) {
      measureBelow(content.current, offset.current + seen.current, then);
    }
  };
  const reveal = (): void => {
    measure((below) => {
      if (below > 0) {
        scroll.current?.scrollTo({ y: offset.current + below });
      }
    });
  };
  const settle = (): void => {
    measure((below) => {
      following.current = below <= 0;
    });
  };
  return {
    content,
    scrollProps: {
      keyboardShouldPersistTaps: 'handled',
      onScroll: ({ nativeEvent }) => {
        offset.current = nativeEvent.contentOffset.y;
      },
      onScrollBeginDrag: () => {
        following.current = false;
      },
      onScrollEndDrag: settle,
      onMomentumScrollEnd: settle,
      onLayout: ({ nativeEvent }) => {
        seen.current = nativeEvent.layout.height;
        following.current = true;
        reveal();
      },
      onContentSizeChange: () => {
        if (following.current) {
          reveal();
        }
      },
      scrollEventThrottle: 16,
    },
  };
}
