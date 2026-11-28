/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, type ReactNode, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { type SharedValue, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { color, Icon } from '@/design-system';

// The red action's width once the row stands open on it.
const ACTION_WIDTH = 80;

interface ActionProps {
  translation: SharedValue<number>;
  // How far to the left a swipe goes to delete without a press: half the screen.
  fullSwipe: number;
  onFullSwipe: (past: boolean) => void;
  onPress: () => void;
}

// The red ground with the white outlined trash, in the space the row leaves on its right. It widens with a swipe past
// it, and tells whether the swipe has gone far enough to delete.
function DeleteAction({ translation, fullSwipe, onFullSwipe, onPress }: ActionProps): ReactElement {
  useAnimatedReaction(
    () => translation.value <= -fullSwipe,
    (past, before) => {
      if (past !== before) {
        scheduleOnRN(onFullSwipe, past);
      }
    },
  );
  const width = useAnimatedStyle(() => ({ width: Math.max(ACTION_WIDTH, -translation.value) }));
  return (
    <Animated.View style={[styles.action, width]}>
      <Pressable accessibilityLabel="알림 지우기" accessibilityRole="button" onPress={onPress} style={styles.press}>
        <Icon color={color.onPrimary} name="trash" size={22} />
      </Pressable>
    </Animated.View>
  );
}

// A kept Notification's row of 알림, which a swipe from right to left slides open on the red action. A press on the
// action, or a swipe past half the screen, deletes it at once: no confirm and no undo.
export function SwipedNotice({ children, onDelete }: { children: ReactNode; onDelete: () => void }): ReactElement {
  const { width } = useWindowDimensions();
  const fullSwiped = useRef(false);
  return (
    <ReanimatedSwipeable
      childrenContainerStyle={styles.row}
      friction={1}
      onSwipeableOpen={() => {
        if (fullSwiped.current) {
          onDelete();
        }
      }}
      overshootRight
      renderRightActions={(_progress, translation) => (
        <DeleteAction
          fullSwipe={width / 2}
          onFullSwipe={(past) => {
            fullSwiped.current = past;
          }}
          onPress={onDelete}
          translation={translation}
        />
      )}
      rightThreshold={ACTION_WIDTH / 2}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  // Over the action, which shows only where the row slides away.
  row: { backgroundColor: color.surface },
  action: { backgroundColor: color.danger },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
