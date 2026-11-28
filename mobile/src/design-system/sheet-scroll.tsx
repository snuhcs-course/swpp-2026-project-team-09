/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createContext, type ReactElement, type Ref, use, useMemo } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';

// The sheet a `SheetScroll` stands in: its body's pull, and where it keeps the content's scroll.
export interface SheetBody {
  pan: PanGesture;
  scrollTop: SharedValue<number>;
}

export const SheetBodyContext = createContext<SheetBody | null>(null);

// The scroll of a `BottomSheet`'s content: it scrolls as any list does, and once at its top a pull further down moves
// the sheet (`useBodyPan`). Outside a sheet it is a plain ScrollView.
export function SheetScroll({ onScroll, ref, ...props }: ScrollViewProps & { ref?: Ref<ScrollView> }): ReactElement {
  const body = use(SheetBodyContext);
  const native = useMemo(
    () => (body === null ? null : Gesture.Native().simultaneousWithExternalGesture(body.pan)),
    [body],
  );
  const scroll = (
    <ScrollView
      scrollEventThrottle={16}
      {...props}
      ref={ref}
      onScroll={(event) => {
        if (body !== null) {
          body.scrollTop.value = Math.max(0, event.nativeEvent.contentOffset.y);
        }
        onScroll?.(event);
      }}
    />
  );
  return native === null ? scroll : <GestureDetector gesture={native}>{scroll}</GestureDetector>;
}
