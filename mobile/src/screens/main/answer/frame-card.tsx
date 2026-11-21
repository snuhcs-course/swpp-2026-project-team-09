/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
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
  // Null leaves the card empty.
  children: ReactNode;
}

// The most the card's content takes, about half the stage, null until the stage is laid out. It never takes less
// than the headline's line, which is all it shows while the keyboard is up and leaves little of the stage.
const LEAST_CONTENT = CONTENT_TOP + text.title.lineHeight;

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

// The frame's card, attached to the bottom of the screen. Its content scrolls inside it. Raised, it reaches up to the
// pill. Only the lowered card tells its height, so that the camera fits the answer to the lowered card alone.
export function FrameCard(props: FrameCardProps): ReactElement {
  const { barRoom, stageHeight, onHeight, testID, hold = false, raising, timeBarHeight = 0, children } = props;
  const contentMax = contentMaxOf(stageHeight, barRoom);
  const { raised } = raising ?? LOWERED;
  const raisedHeight = useRaisedHeight(stageHeight, barRoom, raising, timeBarHeight);
  const drag = useRaiseDrag(raising ?? LOWERED, raisedHeight);
  const { minHeight, onContentSizeChange, scroll } = useHeldHeight(hold);
  const shown = raised && raisedHeight !== null ? { height: raisedHeight } : { maxHeight: contentMax };
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        if (!raised && drag.content === null) {
          onHeight(nativeEvent.layout.height);
        }
      }}
      style={[styles.card, { paddingBottom: barRoom }]}
      testID={testID}
    >
      {raising === undefined ? null : drag.handle}
      {children === null ? null : (
        <Animated.ScrollView
          contentContainerStyle={[styles.content, { minHeight }]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={onContentSizeChange}
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
    </View>
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
});
