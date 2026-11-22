/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { color, radius, shadow, space } from '@/design-system';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { DockGrip, useDockDrag } from './dock-drag';
import { type FrameCardProps, LOWERED, OPEN_EDGE } from './frame-card-parts';
import { GRIP_ROW, GripRow } from './grip-row';
import { OpenCard } from './open-card';
import { CloseHint, MOTION_MS } from './raise-handle';

export { CONTENT_TOP, contentMaxOf } from './frame-card-parts';

// The gap between the sheet's rows (P04 ticket 52).
const GAP = space[3];
// About what the open card's top takes over its scrolling part: the handle's row and the caption row. The open card
// grows from the docked card's height less this, so that its top starts where the docked card's stood.
const OPEN_TOP_GUESS = GRIP_ROW + GAP + space[8];

// The docked card, the bottom sheet at its lowest (P04 ticket 52): full width on the screen's bottom edge, only its top
// corners rounded, as the open card: the header row, the caption row, its content, when there is any, and the input's
// room under it. It tells its height from the stage's bottom, so that the camera keeps the answer clear of it. The whole
// card takes a drag on the UI thread: down closes the answer, up raises the card (`useDockDrag`).
function DockedCard(props: FrameCardProps): ReactElement {
  const { barRoom, onHeight, raising, testID, children } = props;
  // Whether the dock holds anything to show, assumed from the first frame, so that its padding never comes in a frame
  // late: that shifted the card and told the camera a second height (P04 ticket 52).
  const [filled, setFilled] = useState(true);
  const [height, setHeight] = useState(0);
  const drag = useDockDrag(raising ?? LOWERED, height);
  // The shared value alone goes to the UI thread, never the object holding the gesture.
  const { drop } = drag;
  const dropped = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }] }));
  return (
    <>
      <GestureDetector gesture={drag.pan}>
        <Reanimated.View
          onLayout={({ nativeEvent }: LayoutChangeEvent) => {
            setHeight(nativeEvent.layout.height);
            onHeight(nativeEvent.layout.height);
          }}
          style={[styles.dock, { paddingBottom: barRoom }, dropped]}
          testID={testID}
        >
          <GripRow
            edge={OPEN_EDGE}
            handle={<DockGrip raising={raising ?? LOWERED} />}
            onClose={props.onClose ?? null}
            words={props.gripWords ?? null}
          />
          {props.head === undefined ? null : <View style={styles.dockHead}>{props.head}</View>}
          <View style={[styles.dockContent, filled && { paddingTop: GAP }]} testID={`${testID}-content`}>
            <View
              onLayout={({ nativeEvent }: LayoutChangeEvent) => {
                setFilled(nativeEvent.layout.height > 0);
              }}
            >
              {children}
            </View>
          </View>
        </Reanimated.View>
      </GestureDetector>
      {drag.past ? <CloseHint barRoom={barRoom} cardHeight={height} drop={drop} /> : null}
    </>
  );
}

// Which form stands now: the docked one comes in only once the open card has run down to it, so that lowering a raised
// card moves rather than jumps; the open one comes at once, growing from the docked card's height (P04 ticket 52).
function useShownForm(
  docked: boolean,
  barRoom: number,
): { docked: boolean; from: number | null; onDock: (h: number) => void } {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(docked);
  const [from, setFrom] = useState<number | null>(null);
  const dockHeight = useRef<number | null>(null);
  // Raised from the dock, or lowered with reduced motion: at once.
  if (shown !== docked && (!docked || reduce)) {
    setShown(docked);
    if (!docked) {
      setFrom(dockHeight.current === null ? null : Math.max(0, dockHeight.current - barRoom - OPEN_TOP_GUESS));
    }
  }
  useEffect(() => {
    const timer =
      docked && !shown
        ? setTimeout(() => {
            setShown(true);
          }, MOTION_MS)
        : null;
    return (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [docked, shown]);
  return {
    docked: shown,
    from,
    onDock: (h: number): void => {
      dockHeight.current = h;
    },
  };
}

function ignoreHeight(): void {
  // The dock tells its own height.
}

// The frame's card, attached to the bottom of the screen: docked, a row around the input, or open (`OpenCard`).
export function FrameCard(props: FrameCardProps): ReactElement {
  const form = useShownForm(props.docked === true, props.barRoom);
  if (form.docked) {
    return (
      <DockedCard
        {...props}
        onHeight={(h) => {
          form.onDock(h);
          props.onHeight(h);
        }}
      />
    );
  }
  // While the dock is about to take the open card's place, the open card tells the camera nothing: the dock's height is
  // the one value the camera hears for that change (P04 ticket 52).
  return <OpenCard {...props} from={form.from} onHeight={props.docked === true ? ignoreHeight : props.onHeight} />;
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  dockHead: { paddingTop: GAP, paddingHorizontal: OPEN_EDGE },
  dockContent: { paddingHorizontal: OPEN_EDGE },
});
