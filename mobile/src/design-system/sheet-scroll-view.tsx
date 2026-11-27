/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, use, useCallback, useRef } from 'react';
import { type LayoutChangeEvent, type NativeScrollEvent, ScrollView, type ScrollViewProps } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { type SharedValue, useAnimatedRef, useAnimatedScrollHandler } from 'react-native-reanimated';
import { type ScrollMoment, useListPan, useListY } from './sheet-list-pan';
import { type SheetPull, SheetPullContext } from './sheet-pull';

// What a list in a sheet tells of a moment of its scroll: where it stands, and how fast it moved, in points a
// millisecond. A native scroll's event tells as much.
export interface SheetScrollEvent {
  nativeEvent: Pick<NativeScrollEvent, 'contentOffset' | 'velocity'>;
}

type Told = (event: SheetScrollEvent) => void;

type SheetScrollViewProps = Omit<
  ScrollViewProps,
  'onScroll' | 'onScrollBeginDrag' | 'onScrollEndDrag' | 'onMomentumScrollEnd' | 'scrollEnabled' | 'horizontal'
> & {
  onScrollBeginDrag?: Told;
  onScrollEndDrag?: Told;
  onMomentumScrollEnd?: Told;
};

// The list's range, from its own height and its content's, kept as each is laid out.
function useRange(
  range: SharedValue<number>,
  { onLayout, onContentSizeChange }: Pick<ScrollViewProps, 'onLayout' | 'onContentSizeChange'>,
): Pick<ScrollViewProps, 'onLayout' | 'onContentSizeChange'> {
  const sizes = useRef({ view: 0, content: 0 });
  const measured = (): void => {
    range.value = Math.max(0, sizes.current.content - sizes.current.view);
  };
  return {
    onLayout: (event: LayoutChangeEvent) => {
      sizes.current.view = event.nativeEvent.layout.height;
      measured();
      onLayout?.(event);
    },
    onContentSizeChange: (width: number, height: number) => {
      sizes.current.content = height;
      measured();
      onContentSizeChange?.(width, height);
    },
  };
}

// The moments the list's swipe tells, handed to the caller's handlers as a native scroll hands them.
function useTell({
  onScrollBeginDrag,
  onScrollEndDrag,
  onMomentumScrollEnd,
}: Pick<SheetScrollViewProps, 'onScrollBeginDrag' | 'onScrollEndDrag' | 'onMomentumScrollEnd'>): (
  moment: ScrollMoment,
  y: number,
  velocity: number,
) => void {
  return useCallback(
    (moment, y, velocity) => {
      const told = { begin: onScrollBeginDrag, end: onScrollEndDrag, momentum: onMomentumScrollEnd }[moment];
      told?.({ nativeEvent: { contentOffset: { x: 0, y }, velocity: { x: 0, y: velocity } } });
    },
    [onScrollBeginDrag, onScrollEndDrag, onMomentumScrollEnd],
  );
}

// In a sheet: the scroll view takes no touch, and the list's swipe scrolls it or pulls the sheet (`sheet-list-pan.ts`).
function SheetList(props: SheetScrollViewProps & { sheet: SheetPull }): ReactElement {
  const { sheet, contentOffset, snapToInterval, decelerationRate, children, ...rest } = props;
  const { onScrollBeginDrag, onScrollEndDrag, onMomentumScrollEnd, ...view } = rest;
  const scroll = useAnimatedRef<Reanimated.ScrollView>();
  const { scrollY, listY, range } = useListY(scroll, contentOffset?.y ?? 0);
  const sized = useRange(range, view);
  const tell = useTell({ onScrollBeginDrag, onScrollEndDrag, onMomentumScrollEnd });
  const fast = decelerationRate === 'fast';
  const pan = useListPan(sheet, { scrollY, listY, range, snap: snapToInterval ?? 0, fast, tell });
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return (
    <GestureDetector gesture={pan}>
      <Reanimated.ScrollView
        bounces={false}
        overScrollMode="never"
        {...view}
        {...sized}
        contentOffset={contentOffset}
        onScroll={onScroll}
        ref={scroll}
        scrollEnabled={false}
        scrollEventThrottle={16}
      >
        {children}
      </Reanimated.ScrollView>
    </GestureDetector>
  );
}

// The vertical scroll view of a `BottomSheet`'s content (P06 ticket 35), in place of `ScrollView`. A swipe down that
// starts with it at its top pulls the sheet, the list staying at its top; any other swipe scrolls it, a swipe that
// starts with it scrolled down to its top and no further. Outside a sheet it is a plain scroll view.
export function SheetScrollView(props: SheetScrollViewProps): ReactElement {
  const sheet = use(SheetPullContext);
  return sheet === null ? <ScrollView {...props} /> : <SheetList {...props} sheet={sheet} />;
}
