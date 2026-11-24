/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  type SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, shadow, space, text } from '@/design-system';
import { listsTop } from '../layout';
import { type Level, type LevelHeights, LEVELS, stepsOf } from './card-levels';
import { type CardMotion, useCardMotion } from './card-motion';
import { CONTENT_TOP, contentMaxOf, type FrameCardProps, LEAST_CONTENT, LOWERED, OPEN_EDGE } from './frame-card-parts';
import { CardHeader } from './card-header';
import { useHeldHeight } from './held-height';
import { CloseHint } from './raise-handle';
import { SheetHint, useSheetHint } from './sheet-hint';

// The frame's sheet, attached to the bottom of the screen (P04 tickets 52, 57, and 61): one surface whose content is
// laid out once. Its header stays at the top while the content scrolls under it; the footer, the input and the main
// button, stands fixed over its bottom, and the content passes under it with a soft fade. Low shows the header and
// about two lines of the content, middle about half the stage, high up to just under the time card. It moves as a sheet
// (`useCardMotion`). Only the low card tells its height, once settled, so that the camera fits the answer to it alone.

// Low shows this many lines of the content's words, at the phone's font size, over the fade.
const LOW_LINES = 2;
// The soft edge where the content passes under the footer.
const FADE = space[3];
const FADED: ViewStyle = {
  experimental_backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0), ${color.surface})`,
};

interface Caps extends LevelHeights {
  // The scrolling part's laid-out height: the highest step's.
  room: number;
}

// The most the scrolling part shows at each step, under the card's header (`above`); null until the stage is laid out.
// No step reads how much the answer says: a card shorter than a step stops at its own height (`heightsOf`).
function useCaps(props: FrameCardProps, above: number, padTop: number): Caps | null {
  const { stageHeight, barRoom, raising, timeBarHeight = 0, fit = false } = props;
  const { top } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  if (stageHeight === null) {
    return null;
  }
  const mid = Math.max(LEAST_CONTENT, (contentMaxOf(stageHeight, barRoom) ?? LEAST_CONTENT) - above);
  if (raising === undefined) {
    return { low: mid, mid, high: mid, room: mid };
  }
  // High stops just under the time card as it stands by default, tucked away or not (h1, h2, k4).
  const pillRoom = listsTop(top) + (timeBarHeight > 0 ? timeBarHeight + space[2] : 0);
  const high = Math.max(mid, stageHeight - pillRoom - barRoom - above);
  const low = fit ? mid : Math.min(mid, padTop + LOW_LINES * text.bodyLg.lineHeight * fontScale + FADE);
  return { low, mid, high, room: high };
}

// The heights the card runs to: as much as its content, up to each step's cap.
function heightsOf(caps: Caps, natural: number | null): LevelHeights {
  const fit = (cap: number): number => (natural === null ? cap : Math.min(cap, natural));
  const high = fit(caps.high);
  const mid = Math.min(fit(caps.mid), high);
  return { low: Math.min(fit(caps.low), mid), mid, high };
}

function Top(p: { props: FrameCardProps; steps: readonly Level[]; onHeight: (h: number) => void }): ReactElement {
  const { raising = null, onClose = null, onAskNew = null, chip = null } = p.props;
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        p.onHeight(nativeEvent.layout.height);
      }}
    >
      <CardHeader chip={chip} onAskNew={onAskNew} onClose={onClose} raising={raising} steps={p.steps} />
    </View>
  );
}

// Tells the scrolling part's cap at the card's step now.
function useToldCap(cap: number | null, onContentCap: ((cap: number | null) => void) | undefined): void {
  useEffect(() => {
    onContentCap?.(cap);
  }, [cap, onContentCap]);
}

interface ScrollingProps {
  props: FrameCardProps;
  room: number | null;
  padTop: number;
  // It scrolls only at high, where the card does not move up any further.
  scrolls: boolean;
  scroll: ReturnType<typeof useAnimatedRef<Reanimated.ScrollView>>;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  onNatural: (height: number) => void;
}

// The part that scrolls under the card's header, laid out once at `room`, its parts measured as they are laid out.
function Scrolling(p: ScrollingProps): ReactElement {
  const { props, room, padTop, scrolls, scroll, onScroll, onNatural } = p;
  const { minHeight, onContentSizeChange } = useHeldHeight(props.hold === true, scroll);
  return (
    // The card's drag scrolls it (`useCardMotion`): it takes no touch of its own.
    <Reanimated.ScrollView
      contentContainerStyle={[styles.content, { paddingTop: padTop }]}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      overScrollMode="never"
      ref={scroll}
      scrollEventThrottle={16}
      scrollEnabled={false}
      showsVerticalScrollIndicator={scrolls}
      style={room === null ? undefined : { height: room }}
      testID={`${props.testID}-content`}
    >
      <View
        onLayout={({ nativeEvent }: LayoutChangeEvent) => {
          const height = nativeEvent.layout.height + padTop;
          onNatural(height);
          onContentSizeChange(0, height);
        }}
        style={[styles.parts, minHeight === undefined ? null : { minHeight: minHeight - padTop }]}
        testID={`${props.testID}-parts`}
      >
        {props.children}
      </View>
    </Reanimated.ScrollView>
  );
}

interface OpenCardState {
  setAbove: (above: number) => void;
  setNatural: (natural: number) => void;
  padTop: number;
  room: number | null;
  steps: readonly Level[];
  heights: LevelHeights | null;
  motion: CardMotion;
  scroll: ReturnType<typeof useAnimatedRef<Reanimated.ScrollView>>;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  scrolls: boolean;
  // The low card's whole height, which the hints stand over.
  lowHeight: number;
  hint: ReturnType<typeof useSheetHint>;
  onLayout: (event: LayoutChangeEvent) => void;
}

// The card's measures, steps, and motion.
// The sheet's measures: its header's and its content's heights, the caps, and the steps they make.
function useMeasures(props: FrameCardProps): {
  padTop: number;
  above: number;
  setAbove: (above: number) => void;
  natural: number | null;
  setNatural: (natural: number) => void;
  caps: Caps | null;
  heights: LevelHeights | null;
  steps: readonly Level[];
} {
  const topped = props.raising !== undefined || props.onClose !== undefined;
  const padTop = topped ? space[3] : CONTENT_TOP;
  const [above, setAbove] = useState(0);
  const [natural, setNatural] = useState<number | null>(null);
  const caps = useCaps(props, above, padTop);
  const heights = caps === null ? null : heightsOf(caps, natural);
  // Before the stage is laid out every step is offered; laid out, those of different heights.
  const steps = heights === null ? LEVELS : stepsOf(heights);
  return { padTop, above, setAbove, natural, setNatural, caps, heights, steps };
}

// The content's scroll view, how far it is scrolled, and whether it scrolls now: where the card stands at its highest
// step and the content is taller than that. Lowered from there, the content goes back to its top with the card.
function useContentScroll(
  { caps, heights, natural }: Pick<ReturnType<typeof useMeasures>, 'caps' | 'heights' | 'natural'>,
  level: Level,
): Pick<OpenCardState, 'scroll' | 'onScroll' | 'scrolls'> & { scrollY: SharedValue<number>; maxScroll: number } {
  const scroll = useAnimatedRef<Reanimated.ScrollView>();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const scrolls =
    caps !== null && heights !== null && natural !== null && natural > caps.high + 1 && heights[level] >= heights.high;
  useEffect(() => {
    if (!scrolls) {
      scroll.current?.scrollTo({ y: 0, animated: true });
    }
  }, [scrolls, scroll]);
  // The scroll view is laid out at the highest step's cap: the content scrolls by what it has more than that.
  const maxScroll = scrolls && caps !== null && natural !== null ? natural - caps.high : 0;
  return { scroll, scrollY, onScroll, scrolls, maxScroll };
}

// Before the stage is laid out the card has no steps: it is as tall as its content, and tells that. The callback stays
// the same from render to render, so that the moved view's props never change (`OpenCard`).
function useLaidHeight(
  unstepped: boolean,
  setLaid: (height: number) => void,
  onHeight: (height: number) => void,
): (event: LayoutChangeEvent) => void {
  const now = useRef({ unstepped, onHeight });
  useEffect(() => {
    now.current = { unstepped, onHeight };
  }, [unstepped, onHeight]);
  return useCallback(
    ({ nativeEvent }: LayoutChangeEvent): void => {
      if (now.current.unstepped) {
        setLaid(nativeEvent.layout.height);
        now.current.onHeight(nativeEvent.layout.height);
      }
    },
    [setLaid],
  );
}

// The card's measures, steps, and motion.
function useOpenCard(props: FrameCardProps): OpenCardState {
  const { barRoom, onHeight, raising } = props;
  const level = raising?.level ?? 'low';
  const measures = useMeasures(props);
  const { padTop, above, setAbove, setNatural, caps, heights, steps } = measures;
  // Before the stage is laid out: the card's height as laid out, which a drag down measures against.
  const [laid, setLaid] = useState(0);
  const extra = above + barRoom;
  const { scroll, scrollY, onScroll, scrolls, maxScroll } = useContentScroll(measures, level);
  // The hint waits until the stage and the content are laid out, so that it shows only over a card with more to show.
  const hint = useSheetHint(
    raising !== undefined && level === 'low' && measures.natural !== null && heights !== null && steps.length > 1,
  );
  const room = caps?.room ?? null;
  const motion = useCardMotion({
    raising: raising ?? LOWERED,
    heights,
    room,
    extra,
    header: above,
    laid,
    scroll,
    scrollY,
    scrolls,
    maxScroll,
    onHeight,
  });
  useToldCap(caps === null ? null : caps[level], props.onContentCap);
  const onLayout = useLaidHeight(caps === null && level === 'low', setLaid, onHeight);
  return {
    setAbove,
    setNatural,
    padTop,
    room,
    steps,
    heights,
    motion,
    scroll,
    onScroll,
    scrolls,
    hint,
    lowHeight: heights === null ? laid : extra + heights.low,
    onLayout,
  };
}

// The sheet, moved by `useCardMotion`, and the floor over the footer's room at the screen's bottom, which the card's
// lower part passes under with a soft fade, so that nothing of the content shows around the input and the main button.
export function OpenCard(props: FrameCardProps): ReactElement {
  const { barRoom, testID, children } = props;
  const card = useOpenCard(props);
  const { room, motion } = card;
  const { drop, offset } = motion;
  const moved = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value + drop.value }] }));
  return (
    <>
      <GestureDetector gesture={motion.pan}>
        {/* The moved view's own props stay the same from render to render, so that no commit of React's lays an old
            translation over the one the UI thread gave it; what changes stands on the view inside it. */}
        <Reanimated.View
          onLayout={card.onLayout}
          // The first touch of the card takes the first-time hint away.
          onTouchStart={card.hint.leave}
          style={[styles.card, moved]}
          testID={testID}
        >
          <View style={{ paddingBottom: barRoom }}>
            {props.raising !== undefined || props.onClose !== undefined ? (
              <Top onHeight={card.setAbove} props={props} steps={card.steps} />
            ) : null}
            {children === null ? null : (
              <Scrolling
                onNatural={card.setNatural}
                onScroll={card.onScroll}
                padTop={card.padTop}
                props={props}
                room={room}
                scroll={card.scroll}
                scrolls={card.scrolls}
              />
            )}
          </View>
        </Reanimated.View>
      </GestureDetector>
      {room === null ? null : (
        <>
          <View style={[styles.fade, FADED, { bottom: barRoom }]} testID={`${testID}-fade`} />
          <View style={[styles.floor, { height: barRoom }]} />
        </>
      )}
      {card.hint.shown ? <SheetHint bottom={card.lowHeight} /> : null}
      {motion.past ? <CloseHint barRoom={barRoom} cardHeight={card.lowHeight} drop={drop} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  content: { paddingHorizontal: OPEN_EDGE },
  parts: { gap: space[3] },
  // Over the footer's room at the screen's bottom, under the input and the main button; it stays while the card goes
  // under it to close (e2, e3).
  floor: { position: 'absolute', right: 0, bottom: 0, left: 0, pointerEvents: 'none', backgroundColor: color.surface },
  fade: { position: 'absolute', right: 0, left: 0, height: FADE, pointerEvents: 'none' },
});
