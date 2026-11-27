/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, use } from 'react';
import type { ScrollViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { SheetPullContext, usePull } from './sheet-pull';

// The vertical scroll view of a `BottomSheet`'s content (P06 ticket 35), in place of `ScrollView`. It scrolls
// natively, and a swipe down that starts with it at its top pulls the sheet instead, the list staying at its top. A
// swipe that starts with it scrolled only scrolls it. It does not bounce past its ends, so that a pull does not
// stretch it. Outside a sheet it is a plain scroll view.
export function SheetScrollView({
  contentOffset,
  children,
  ...props
}: Omit<ScrollViewProps, 'onScroll'>): ReactElement {
  const sheet = use(SheetPullContext);
  const ref = useAnimatedRef<Reanimated.ScrollView>();
  const scrollY = useSharedValue(contentOffset?.y ?? 0);
  const { gesture, pulling } = usePull(sheet, scrollY);
  const onScroll = useAnimatedScrollHandler((event) => {
    if (pulling.value && event.contentOffset.y > 0) {
      scrollTo(ref, 0, 0, false);
      scrollY.value = 0;
      return;
    }
    scrollY.value = event.contentOffset.y;
  });
  const view = (
    <Reanimated.ScrollView
      bounces={false}
      overScrollMode="never"
      {...props}
      contentOffset={contentOffset}
      onScroll={onScroll}
      ref={ref}
      scrollEventThrottle={16}
    >
      {children}
    </Reanimated.ScrollView>
  );
  if (sheet === null) {
    return view;
  }
  // The sheet's own swipe waits while this one decides, and the native scroll runs beside it.
  const pull = gesture.blocksExternalGesture(sheet.ref);
  return <GestureDetector gesture={Gesture.Simultaneous(Gesture.Native(), pull)}>{view}</GestureDetector>;
}
