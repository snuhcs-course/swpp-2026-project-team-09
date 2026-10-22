/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { color } from '@/design-system/tokens';
import { useEdgeCloser } from '@/hooks/use-back-to-close';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { EDGE_WIDTH, edgeSwipe, goesBack } from './swipe-rule';

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
  const swipe = edgeSwipe(`edge-back-${name}`)
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
    });
  return (
    <GestureDetector gesture={swipe}>
      <View collapsable={false} style={styles.ground}>
        <Animated.View style={[styles.tab, { transform: [{ translateX: x }] }]}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

// Over an open side panel or bottom sheet, the left edge's strip: a swipe from it past the rule's line closes the
// latest to open, as Android's back button does. Nothing follows the finger; the panel or sheet slides away as it
// does for the back button. With nothing open there is no strip.
export function EdgeClose(): ReactElement | null {
  const { width } = useWindowDimensions();
  const close = useEdgeCloser();
  if (close === null) {
    return null;
  }
  const swipe = edgeSwipe('edge-close').onEnd(({ translationX, velocityX }) => {
    if (goesBack(translationX, velocityX, width)) {
      close();
    }
  });
  return (
    <GestureDetector gesture={swipe}>
      <View collapsable={false} style={styles.strip} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  ground: { flex: 1, backgroundColor: color.surfaceSunken },
  tab: { flex: 1, boxShadow: '-4px 0 16px rgba(14, 19, 48, 0.12)' },
  strip: { position: 'absolute', top: 0, bottom: 0, left: 0, width: EDGE_WIDTH },
});
