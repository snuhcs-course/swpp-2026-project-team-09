/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { color } from '@/design-system';
import type { Point, Size } from '@/map';
import type { ZoneDrawing } from './use-zone-drawing';

// The finger's path over the zone screen's map while the pencil holds the map still. The zones themselves are lines
// of the map (`zone-lines.ts`), which move with it.
export function StrokeLayer({ stroke, size }: { stroke: readonly Point[]; size: Size }): ReactElement {
  const d = stroke.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <View style={styles.layer}>
      <Svg height={size.height} width={size.width}>
        <Path d={d} fill="none" stroke={color.private} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
      </Svg>
    </View>
  );
}

// Over the whole map while the pencil is on: one finger draws, and the map under it is held still.
export function DrawingOverlay({ stroke }: Pick<ZoneDrawing, 'stroke'>): ReactElement {
  const { begin, extend, end } = stroke;
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('zone-drawing')
        .runOnJS(true)
        .minDistance(0)
        .maxPointers(1)
        .onBegin(({ x, y }) => {
          begin({ x, y });
        })
        .onStart(({ x, y }) => {
          extend({ x, y });
        })
        .onUpdate(({ x, y }) => {
          extend({ x, y });
        })
        .onFinalize(() => {
          end();
        }),
    [begin, extend, end],
  );
  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false} style={StyleSheet.absoluteFill} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
});
