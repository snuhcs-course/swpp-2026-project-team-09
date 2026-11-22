/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useState } from 'react';
import { type LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import type { PanGesture } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, shadow, space } from '@/design-system';
import { listsTop } from '../layout';
import { type Level, levelOf } from './card-levels';
import { type Targets, useCardMotion } from './card-motion';
import { CONTENT_TOP, contentMaxOf, type FrameCardProps, LEAST_CONTENT, LOWERED, OPEN_EDGE } from './frame-card-parts';
import { CardHeader } from './card-header';
import { useHeldHeight } from './held-height';
import { CloseHint, DragRow } from './raise-handle';

// The frame's open card, attached to the bottom of the screen (moved out of `frame-card.tsx` for its length). Its
// header stays while the rest scrolls under it. Lowered, the rest takes at most about
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

function capOf(level: Level, caps: Caps): number | null {
  if (level === 'full') {
    return caps.full;
  }
  return level === 'raised' ? caps.raised : caps.lowered;
}

function Top(p: { props: FrameCardProps; pan: PanGesture; onHeight: (h: number) => void }): ReactElement {
  const { raising = null, onClose = null, onAskNew = null, gripLabel = null, chip = null } = p.props;
  const header = <CardHeader chip={chip} label={gripLabel} onAskNew={onAskNew} onClose={onClose} raising={raising} />;
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        p.onHeight(nativeEvent.layout.height);
      }}
    >
      {raising === null ? header : <DragRow pan={p.pan}>{header}</DragRow>}
    </View>
  );
}

// Tells the scrolling part's cap at the card's step now.
function useToldCap(cap: number | null, onContentCap: ((cap: number | null) => void) | undefined): void {
  useEffect(() => {
    onContentCap?.(cap);
  }, [cap, onContentCap]);
}

// The scrolling part's laid-out height: its highest step's, which the card is laid out at once and moved from.
function roomOf({ lowered, raised, full }: Caps): number | null {
  return full ?? raised ?? lowered;
}

function shownOf(level: Level, { lowered, raised, full }: Targets): number | null {
  if (level === 'full') {
    return full ?? raised;
  }
  return level === 'raised' ? raised : lowered;
}

interface ScrollingProps {
  props: FrameCardProps;
  room: number | null;
  // What of the laid-out height stands below the step's: the content ends that far lower, so that its last part can be
  // scrolled up into what shows.
  tail: number;
  topped: boolean;
  onNatural: (height: number) => void;
}

// The part that scrolls under the card's top, laid out once at `room`: its parts measured as they are laid out, and a
// tail under them.
function Scrolling({ props, room, tail, topped, onNatural }: ScrollingProps): ReactElement {
  const { minHeight, onContentSizeChange, scroll } = useHeldHeight(props.hold === true);
  const padTop = topped ? space[3] : CONTENT_TOP;
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: padTop }]}
      keyboardShouldPersistTaps="handled"
      ref={scroll}
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
      >
        {props.children}
      </View>
      {tail > 0 ? <View style={{ height: tail }} testID={`${props.testID}-tail`} /> : null}
    </ScrollView>
  );
}

// The open card, moved as a sheet (`useCardMotion`), and the floor over the input's room at the screen's bottom, which
// the card's lower part passes under, so that nothing shows beside the input.
export function OpenCard(props: FrameCardProps & { from: number | null }): ReactElement {
  const { barRoom, onHeight, testID, raising, children } = props;
  const [above, setAbove] = useState(0);
  const [natural, setNatural] = useState<number | null>(null);
  const caps = useCaps(props, above);
  const targets = targetsOf(caps, natural);
  const room = roomOf(caps);
  const extra = above + barRoom;
  const motion = useCardMotion({ raising: raising ?? LOWERED, targets, room, from: props.from, extra, onHeight });
  const level = levelOf(raising?.raised === true, raising?.full === true);
  useToldCap(capOf(level, caps), props.onContentCap);
  const shown = shownOf(level, targets);
  const { offset, drop } = motion;
  const moved = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value + drop.value }] }));
  const floored = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }] }));
  const topped = raising !== undefined || props.onClose !== undefined;
  return (
    <>
      <Reanimated.View
        onLayout={({ nativeEvent }: LayoutChangeEvent) => {
          // Before the stage is laid out the card has no steps: it is as tall as its content, and tells that.
          if (room === null && raising?.raised !== true) {
            onHeight(nativeEvent.layout.height);
          }
        }}
        style={[styles.card, { paddingBottom: barRoom }, moved]}
        testID={testID}
      >
        {topped ? <Top onHeight={setAbove} pan={motion.pan} props={props} /> : null}
        {children === null ? null : (
          <Scrolling
            onNatural={setNatural}
            props={props}
            room={room}
            tail={room === null || shown === null ? 0 : Math.max(0, room - shown)}
            topped={topped}
          />
        )}
      </Reanimated.View>
      {room === null ? null : <Reanimated.View style={[styles.floor, { height: barRoom }, floored]} />}
      {motion.past ? <CloseHint barRoom={barRoom} cardHeight={extra + (targets.lowered ?? 0)} drop={drop} /> : null}
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
  // Over the input's room at the screen's bottom, under the input.
  floor: { position: 'absolute', right: 0, bottom: 0, left: 0, pointerEvents: 'none', backgroundColor: color.surface },
});
