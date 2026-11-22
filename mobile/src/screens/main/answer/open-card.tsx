/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import type { PanGesture } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, shadow, space } from '@/design-system';
import { listsTop } from '../layout';
import { type Level, levelOf } from './card-levels';
import { type CardMotion, type Targets, useCardMotion } from './card-motion';
import { CONTENT_TOP, contentMaxOf, type FrameCardProps, LEAST_CONTENT, LOWERED, OPEN_EDGE } from './frame-card-parts';
import { GripRow } from './grip-row';
import { useHeldHeight } from './held-height';
import { CloseHint, DragRow, Handle } from './raise-handle';

// The frame's open card, attached to the bottom of the screen (moved out of `frame-card.tsx` for its length). Its top,
// the handle's row and the caption row, stays while the rest scrolls under it. Lowered, the rest takes at most about
// half the stage; raised, as much as its content up to under the time bar; full, the card's top is just under the status
// bar (P04 ticket 52). It moves as a sheet (`useCardMotion`). Only the lowered card tells its height, once settled, so
// that the camera fits the answer to the lowered card alone.

// The most the scrolling part takes at each step, under the card's top (`above`); null until the stage is laid out.
type Caps = Targets;

function useCaps(props: FrameCardProps, above: number): Caps {
  const { stageHeight, barRoom, raising, timeBarHeight = 0 } = props;
  const { top } = useSafeAreaInsets();
  if (stageHeight === null) {
    return { lowered: null, raised: null, full: null };
  }
  const cardMax = contentMaxOf(stageHeight, barRoom) ?? LEAST_CONTENT;
  const pillRoom = listsTop(top) + (timeBarHeight > 0 ? timeBarHeight + space[2] : 0);
  const raisedCard = Math.max(LEAST_CONTENT, stageHeight - pillRoom - barRoom);
  const fullCard = Math.max(LEAST_CONTENT, stageHeight - barRoom);
  return {
    lowered: Math.max(LEAST_CONTENT, cardMax - above),
    raised: raising === undefined ? null : raisedCard - above,
    full: raising?.setFull === undefined ? null : fullCard - above,
  };
}

// The heights the card runs to: as much as its content, up to each step's cap, but full takes the whole height.
function targetsOf({ lowered, raised, full }: Caps, natural: number | null): Targets {
  const fit = (cap: number | null): number | null => (cap === null || natural === null ? cap : Math.min(cap, natural));
  return { lowered: fit(lowered), raised: fit(raised), full };
}

// While the content's own height is not known yet and nothing moves, the step's cap as a plain style.
function plainOf(level: Level, { lowered, raised, full }: Caps): object | undefined {
  if (level === 'full' && full !== null) {
    return { height: full };
  }
  const cap = level === 'lowered' ? lowered : (raised ?? lowered);
  return cap === null ? undefined : { maxHeight: cap };
}

function capOf(level: Level, caps: Caps): number | null {
  if (level === 'full') {
    return caps.full;
  }
  return level === 'raised' ? caps.raised : caps.lowered;
}

function Top(p: {
  props: FrameCardProps;
  handle: ReactElement | null;
  pan: PanGesture;
  onHeight: (h: number) => void;
}): ReactElement {
  const { onClose = null, gripWords = null, head } = p.props;
  const row = <GripRow edge={OPEN_EDGE} handle={p.handle} onClose={onClose} words={gripWords} />;
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        p.onHeight(nativeEvent.layout.height);
      }}
    >
      {p.handle === null && onClose === null ? null : p.handle === null ? row : <DragRow pan={p.pan}>{row}</DragRow>}
      {head === undefined ? null : <View style={styles.head}>{head}</View>}
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
  motion: CardMotion;
  // The step's cap as a plain style, while the content's own height is not known yet and nothing moves.
  plain: object | undefined;
  topped: boolean;
  onNatural: (height: number) => void;
}

// The part that scrolls under the card's top: as tall as `motion.height` while it moves or once its content is
// measured.
function Scrolling({ props, motion, plain, topped, onNatural }: ScrollingProps): ReactElement {
  const { minHeight, onContentSizeChange, scroll } = useHeldHeight(props.hold === true);
  // A worklet copies what it reads to the UI thread: the shared value alone, never the object holding the gesture.
  const { height: moved } = motion;
  const animated = useAnimatedStyle(() => ({ height: moved.value }));
  const [known, setKnown] = useState(false);
  return (
    <Reanimated.ScrollView
      contentContainerStyle={[styles.content, { minHeight }, topped && styles.underTop]}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={(width, height) => {
        setKnown(true);
        onNatural(height);
        onContentSizeChange(width, height);
      }}
      ref={scroll}
      testID={`${props.testID}-content`}
      style={motion.moving || known ? animated : plain}
    >
      {props.children}
    </Reanimated.ScrollView>
  );
}

export function OpenCard(props: FrameCardProps & { from: number | null }): ReactElement {
  const { barRoom, onHeight, testID, raising, children } = props;
  const [above, setAbove] = useState(0);
  const [natural, setNatural] = useState<number | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const caps = useCaps(props, above);
  const targets = targetsOf(caps, natural);
  const motion = useCardMotion({ raising: raising ?? LOWERED, targets, from: props.from, onHeight, cardHeight });
  const level = levelOf(raising?.raised === true, raising?.full === true);
  useToldCap(capOf(level, caps), props.onContentCap);
  const { drop } = motion;
  const dropped = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }] }));
  const topped = raising !== undefined || props.onClose !== undefined || props.head !== undefined;
  const handle = raising === undefined ? null : <Handle raising={raising} />;
  return (
    <>
      <Reanimated.View
        onLayout={({ nativeEvent }: LayoutChangeEvent) => {
          setCardHeight(nativeEvent.layout.height);
          motion.onCardLayout(nativeEvent.layout.height);
        }}
        style={[styles.card, { paddingBottom: barRoom }, dropped]}
        testID={testID}
      >
        {topped ? <Top handle={handle} onHeight={setAbove} pan={motion.pan} props={props} /> : null}
        {children === null ? null : (
          <Scrolling
            motion={motion}
            onNatural={setNatural}
            plain={plainOf(level, caps)}
            props={props}
            topped={topped}
          />
        )}
      </Reanimated.View>
      {motion.past ? <CloseHint barRoom={barRoom} cardHeight={cardHeight} drop={drop} /> : null}
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
  content: { gap: space[3], paddingTop: CONTENT_TOP, paddingHorizontal: OPEN_EDGE },
  // Under the card's top, which stays while the content scrolls.
  underTop: { paddingTop: space[3] },
  // One gap under the header row.
  head: { paddingTop: space[3], paddingHorizontal: OPEN_EDGE },
});
