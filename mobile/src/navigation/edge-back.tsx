/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-23  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { color } from '@/design-system/tokens';
import { useEdgeCloser } from '@/hooks/use-back-to-close';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { edgeSwipe, goesBack } from './swipe-rule';

interface TabEdgeBackProps {
  // The tab's route, which names its swipe for the tests.
  name: string;
  // What the back button does on this tab: show 지도.
  onBack: () => void;
  children: ReactNode;
}

// A tab other than 지도, which a swipe from the left edge takes back to 지도 as Android's back button does. The tab
// follows the finger over a darker ground, with a shadow at its edge; let go past the rule's line it shows 지도, short
// of it it slides back. Where the phone asks for less motion the tab stays still and only the line counts.
export function TabEdgeBack({ name, onBack, children }: TabEdgeBackProps): ReactElement {
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [x] = useState(() => new Animated.Value(0));
  // While a side panel or a bottom sheet is open, the edge's swipe closes it instead (`EdgeClose`).
  const covered = useEdgeCloser() !== null;
  const swipe = useMemo(
    () =>
      edgeSwipe(`edge-back-${name}`)
        .enabled(!covered)
        .onUpdate(({ translationX }) => {
          if (!reduceMotion) {
            x.setValue(Math.max(0, translationX));
          }
        })
        .onEnd(({ translationX, velocityX }) => {
          if (goesBack(translationX, velocityX, width)) {
            x.setValue(0);
            onBack();
          } else if (reduceMotion) {
            x.setValue(0);
          } else {
            Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          }
        })
        .onFinalize((_event, success) => {
          if (!success) {
            x.setValue(0);
          }
        }),
    [name, covered, reduceMotion, x, width, onBack],
  );
  return (
    <GestureDetector gesture={swipe}>
      <View collapsable={false} style={styles.ground}>
        <Animated.View style={[styles.tab, { transform: [{ translateX: x }] }]}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

// Around the app, its side panels and its bottom sheets: while one is open, a swipe from the left edge past the rule's
// line closes the latest to open, as Android's back button does. Nothing follows the finger; the panel or sheet slides
// away as it does for the back button. The swipe sits on a view that takes no touch itself, so a press or a scroll that
// starts at the edge still reaches what is under the finger: only a swipe to the right takes the touch. With nothing
// open the swipe is off, and the view stays so that the app under it is never mounted again.
export function EdgeClose({ children }: { children: ReactNode }): ReactElement {
  const { width } = useWindowDimensions();
  const close = useEdgeCloser();
  const swipe = useMemo(
    () =>
      edgeSwipe('edge-close')
        .enabled(close !== null)
        .onEnd(({ translationX, velocityX }) => {
          if (close !== null && goesBack(translationX, velocityX, width)) {
            close();
          }
        }),
    [close, width],
  );
  return (
    <GestureDetector gesture={swipe}>
      <View collapsable={false} style={styles.over}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  ground: { flex: 1, backgroundColor: color.surfaceSunken },
  tab: { flex: 1, boxShadow: '-4px 0 16px rgba(14, 19, 48, 0.12)' },
  over: { flex: 1, pointerEvents: 'box-none' },
});
