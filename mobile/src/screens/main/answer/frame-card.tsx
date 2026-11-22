/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { Animated, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, shadow, space, text } from '@/design-system';
import { ANSWER_PILL, listsTop } from '../layout';
import { useHeldHeight } from './held-height';
import { type Raising, useRaiseDrag } from './raise-handle';

// Above the first of the card's parts.
export const CONTENT_TOP = space[5];

interface FrameCardProps {
  // From the stage's bottom: the room the card keeps under its content.
  barRoom: number;
  // The stage's height, null until it is laid out: the card takes at most about half of it.
  stageHeight: number | null;
  onHeight: (height: number) => void;
  testID: string;
  // Keeps the content's height, while a reply is on its way.
  hold?: boolean;
  // The handle that raises the card up to the pill and lowers it again. Left out, the card has one height.
  raising?: Raising;
  // The time bar's height under the pill, which the raised card stops under. Left out, none.
  timeBarHeight?: number;
  // Nothing to read: one rounded row around the input, inset from the sides, with no handle (board 10).
  docked?: boolean;
  // The AI input's bottom from the stage's bottom, which the docked card's edge stands just under.
  inputBottom?: number;
  // Null leaves the card empty.
  children: ReactNode;
}

// The most the card's content takes, about half the stage, null until the stage is laid out. It never takes less
// than the headline's line and one row of follow-ups, which is all it shows while the keyboard is up and leaves little
// of the stage.
const FOLLOW_UP_ROW = 32;
const LEAST_CONTENT = CONTENT_TOP + text.title.lineHeight + space[3] + FOLLOW_UP_ROW;

export function contentMaxOf(stageHeight: number | null, barRoom: number): number | null {
  return stageHeight === null ? null : Math.max(LEAST_CONTENT, stageHeight / 2 - barRoom);
}

const LOWERED: Raising = {
  raised: false,
  setRaised: () => {
    // A card without the handle stays lowered.
  },
};

// The content's height while raised: from under the pill, and the time bar when there is one, to the bar's room. Null
// until the stage is laid out.
function useRaisedHeight(
  stageHeight: number | null,
  barRoom: number,
  raising: Raising | undefined,
  timeBarHeight: number,
): number | null {
  const { top } = useSafeAreaInsets();
  const pillRoom = listsTop(top) + ANSWER_PILL.height + space[2] + (timeBarHeight > 0 ? timeBarHeight + space[2] : 0);
  return stageHeight === null || raising === undefined
    ? null
    : Math.max(LEAST_CONTENT, stageHeight - pillRoom - barRoom);
}

// The dock's edge under the input and its room above it, and its inset from the screen's sides.
const DOCK_BELOW = 6;
const DOCK_ABOVE = space[2];
const DOCK_SIDE = space[2] + 2;

// The docked card: its content, when there is any, in one row over the input, and the input's room under it. It tells
// its height from the stage's bottom, so that the camera keeps the answer clear of it.
function DockedCard({ barRoom, inputBottom = 0, onHeight, testID, children }: FrameCardProps): ReactElement {
  const [inner, setInner] = useState(0);
  const inputTop = barRoom - space[3];
  const bottom = Math.max(0, inputBottom - DOCK_BELOW);
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onHeight(nativeEvent.layout.height + bottom);
      }}
      style={[styles.dock, { bottom, paddingBottom: inputTop - bottom + DOCK_ABOVE }]}
      testID={testID}
    >
      <View
        onLayout={({ nativeEvent }: LayoutChangeEvent) => {
          setInner(nativeEvent.layout.height);
        }}
        style={[styles.dockContent, inner > 0 && { paddingTop: DOCK_ABOVE }]}
        testID={`${testID}-content`}
      >
        {children}
      </View>
    </View>
  );
}

// The frame's card, attached to the bottom of the screen. Its content scrolls inside it. Raised, it is as tall as its
// content, up to the pill. Only the lowered card tells its height, so that the camera fits the answer to the lowered card alone.
export function FrameCard(props: FrameCardProps): ReactElement {
  return props.docked === true ? <DockedCard {...props} /> : <OpenCard {...props} />;
}

function OpenCard(props: FrameCardProps): ReactElement {
  const { barRoom, stageHeight, onHeight, testID, hold = false, raising, timeBarHeight = 0, children } = props;
  const contentMax = contentMaxOf(stageHeight, barRoom);
  const { raised } = raising ?? LOWERED;
  const raisedHeight = useRaisedHeight(stageHeight, barRoom, raising, timeBarHeight);
  // Raised, the card is as tall as its content, up to under the pill, and a drag goes no higher.
  const [natural, setNatural] = useState<number | null>(null);
  const raisedTo = raisedHeight === null || natural === null ? raisedHeight : Math.min(raisedHeight, natural);
  const drag = useRaiseDrag(raising ?? LOWERED, raisedTo);
  const { minHeight, onContentSizeChange, scroll } = useHeldHeight(hold);
  const shown = { maxHeight: raised && raisedHeight !== null ? raisedHeight : contentMax };
  return (
    <Animated.View
      onLayout={(event: LayoutChangeEvent) => {
        drag.onCardLayout(event);
        if (!raised && drag.content === null) {
          onHeight(event.nativeEvent.layout.height);
        }
      }}
      style={[
        styles.card,
        { paddingBottom: barRoom },
        drag.drop === null ? null : { transform: [{ translateY: drag.drop }] },
      ]}
      testID={testID}
    >
      {raising === undefined ? null : drag.handle}
      {children === null ? null : (
        <Animated.ScrollView
          contentContainerStyle={[styles.content, { minHeight }]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={(width, height) => {
            setNatural(height);
            onContentSizeChange(width, height);
          }}
          onLayout={({ nativeEvent }: LayoutChangeEvent) => {
            drag.onContentLayout(nativeEvent.layout.height);
          }}
          ref={scroll}
          testID={`${testID}-content`}
          style={drag.content === null ? (contentMax === null ? undefined : shown) : { height: drag.content }}
        >
          {children}
        </Animated.ScrollView>
      )}
    </Animated.View>
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
  content: { gap: space[3], paddingTop: CONTENT_TOP, paddingHorizontal: space[4] },
  dock: {
    position: 'absolute',
    right: DOCK_SIDE,
    left: DOCK_SIDE,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  dockContent: { paddingHorizontal: space[3] },
});
