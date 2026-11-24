/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  type SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { color, radius, shadow, space } from '@/design-system';
import { type Caps, FADE, heightsOf, underOf, useCaps } from './card-caps';
import { type Level, type LevelHeights, LEVELS, stepsOf } from './card-levels';
import { type CardMotion, useCardMotion } from './card-motion';
import { CONTENT_TOP, type FrameCardProps, LOWERED, OPEN_EDGE } from './frame-card-parts';
import { CardHeader } from './card-header';
import { useHeldHeight, useTopWhen } from './held-height';
import { CloseHint } from './raise-handle';
import { SheetHint, useSheetHint } from './sheet-hint';

// The frame's sheet, attached to the bottom of the screen (P04 tickets 52, 57, and 61): one surface whose content is
// laid out once. Its header stays at the top while the content scrolls under it; the footer, the input and the main
// button, stands fixed over its bottom, and the content passes under it with a soft fade. Low shows the header and
// about two lines of the content; middle has its top edge at half the screen; high stands just under the time card. At
// every step the content scrolls as far as lets its end come clear of the fade, and keeps its place when the card
// changes step. It moves as a sheet (`useCardMotion`). Only the low card tells its height, once settled, so that the
// camera fits the answer to it alone.

const FADED: ViewStyle = {
  experimental_backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0), ${color.surface})`,
};

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
  // Room under the content, so that it scrolls as far as the low card needs.
  padBottom: number;
  // It has more than shows at the card's step.
  scrolls: boolean;
  scroll: ReturnType<typeof useAnimatedRef<Reanimated.ScrollView>>;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  onNatural: (height: number) => void;
}

// The part that scrolls under the card's header, laid out once at `room`, its parts measured as they are laid out.
function Scrolling(p: ScrollingProps): ReactElement {
  const { props, room, padTop, padBottom, scrolls, scroll, onScroll, onNatural } = p;
  const { minHeight, onContentSizeChange } = useHeldHeight(props.hold === true, scroll);
  useTopWhen(props.atTop === true, scroll);
  return (
    // The card's drag scrolls it (`useCardMotion`): it takes no touch of its own.
    <Reanimated.ScrollView
      contentContainerStyle={[styles.content, { paddingTop: padTop, paddingBottom: padBottom }]}
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
  padBottom: number;
  // The low card's whole height, which the hints stand over.
  lowHeight: number;
  hint: ReturnType<typeof useSheetHint>;
  onLayout: (event: LayoutChangeEvent) => void;
}

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
  const heights = caps === null ? null : heightsOf(caps, natural, { padTop, under: underOf(props) });
  // Before the stage is laid out every step is offered; laid out, those of different heights.
  const steps = heights === null ? LEVELS : stepsOf(heights);
  return { padTop, above, setAbove, natural, setNatural, caps, heights, steps };
}

// The content's scroll view, how far it is scrolled, and its whole height with the fade's room under it, by which it
// scrolls at each step as far as it has more than shows there. It keeps its place when the card changes step; a new
// question starts it at its top (`useHeldHeight`).
function useContentScroll(
  {
    caps,
    heights,
    natural,
    under,
  }: Pick<ReturnType<typeof useMeasures>, 'caps' | 'heights' | 'natural'> & {
    under: number;
  },
  level: Level,
): Pick<OpenCardState, 'scroll' | 'onScroll' | 'scrolls' | 'padBottom'> & {
  scrollY: SharedValue<number>;
  whole: number;
} {
  const scroll = useAnimatedRef<Reanimated.ScrollView>();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const whole = natural === null ? 0 : natural + under;
  const scrolls = heights !== null && whole > heights[level] + 1;
  // The scroll view is laid out at the highest step's height: under the content it needs as much room as the low card
  // shows less, so that the content scrolls its end clear of the fade there too.
  const padBottom = caps === null || heights === null ? 0 : caps.room - heights.low + FADE;
  return { scroll, scrollY, onScroll, scrolls, whole, padBottom };
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
  const { scroll, scrollY, onScroll, scrolls, whole, padBottom } = useContentScroll(
    { ...measures, under: underOf(props) },
    level,
  );
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
    whole,
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
    padBottom,
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
  // What React holds for the view is where it rests, after the animated style, so that a commit of React's lays the
  // right place again (`useRun`); the UI thread moves it from there.
  const rested = useMemo(() => ({ transform: [{ translateY: motion.rest }] }), [motion.rest]);
  return (
    <>
      <GestureDetector gesture={motion.pan}>
        {/* The moved view's own props change only with where it rests; the rest stands on the view inside it. */}
        <Reanimated.View
          onLayout={card.onLayout}
          // The first touch of the card takes the first-time hint away.
          onTouchStart={card.hint.leave}
          style={[styles.card, moved, rested]}
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
                padBottom={card.padBottom}
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
