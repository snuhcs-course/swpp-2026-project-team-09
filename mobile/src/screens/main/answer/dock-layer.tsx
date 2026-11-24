/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { color, space } from '@/design-system';
import { OPEN_EDGE } from './frame-card-parts';

// The dock an answer shows at the card's lowest step, held over the open card's content (P04 ticket 57).

// The gap between the header and the dock's content (P04 ticket 52).
const GAP = space[3];
// The last stretch of the way down, over which the dock fades in.
const FADE = 32;
const EDGE = 4;

// What a layer that does not show gets: no screen reader and no touch, nothing laid out again.
export function hiddenProps(hidden: boolean): {
  'aria-hidden': boolean;
  importantForAccessibility: 'no-hide-descendants' | 'auto';
  pointerEvents: 'none' | 'auto';
} {
  return {
    'aria-hidden': hidden,
    importantForAccessibility: hidden ? 'no-hide-descendants' : 'auto',
    pointerEvents: hidden ? 'none' : 'auto',
  };
}

interface DockLayerProps {
  testID: string;
  // The dock's height and the raised step's, null until known; the scrolling part's laid-out height.
  height: number | null;
  raised: number | null;
  room: number | null;
  offset: SharedValue<number>;
  // The card rests at its lowest step: the dock shows and takes the touches.
  atRest: boolean;
  pan: PanGesture;
  onHeight: (height: number) => void;
  children: ReactNode;
}

// The dock over the top of the scrolling part (P04 ticket 57): opaque, laid out once, and faded in on the UI thread as
// the card comes down the last stretch to its height. The whole dock takes a drag (P04 ticket 52).
export function DockLayer(p: DockLayerProps): ReactElement {
  const { height, raised, room, offset, atRest } = p;
  const faded = useAnimatedStyle(() => {
    if (room === null || height === null) {
      return { opacity: atRest ? 1 : 0 };
    }
    const span = Math.max(1, Math.min(FADE, (raised ?? height) - height));
    const shows = room - offset.value;
    return { opacity: Math.min(1, Math.max(0, (height + span - shows) / span)) };
  });
  return (
    <GestureDetector gesture={p.pan}>
      <Reanimated.View
        {...hiddenProps(!atRest)}
        style={[styles.dock, height !== 0 && { paddingTop: GAP }, faded]}
        testID={`${p.testID}-dock`}
      >
        <View
          onLayout={({ nativeEvent }: LayoutChangeEvent) => {
            const inner = nativeEvent.layout.height;
            p.onHeight(inner > 0 ? inner + GAP : 0);
          }}
          testID={`${p.testID}-dock-parts`}
        >
          {p.children}
        </View>
      </Reanimated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    // A little more than the dock's height, under the floor, so that a part of a pixel of the content never shows
    // between the dock and the floor.
    paddingBottom: EDGE,
    paddingHorizontal: OPEN_EDGE,
    backgroundColor: color.surface,
  },
});
