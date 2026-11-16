/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import type { PrivateZone } from '@/api/private-zone-types';
import type { LatLng } from '@/api/types';
import { color } from '@/design-system';
import { inView, type Point } from '@/map';
import type { ZoneDrawing, ZoneView } from './use-zone-drawing';

// What is drawn over the zone screen's map: the zones, the outline not yet saved, and the finger's path, each put in
// the view by the camera the map last settled at.

function pathOf(points: readonly Point[], closed: boolean): string {
  const lines = points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  return `${lines.join(' ')}${closed ? ' Z' : ''}`;
}

interface ZoneLayerProps {
  zones: readonly PrivateZone[];
  unsaved: readonly LatLng[] | null;
  stroke: readonly Point[] | null;
  view: ZoneView;
}

// Filled by SVG's default nonzero rule, the one the main server holds a position by. The unsaved outline gives way to
// the finger drawing the next one.
export function ZoneLayer({ zones, unsaved, stroke, view }: ZoneLayerProps): ReactElement {
  const placed = (outline: readonly LatLng[]): Point[] => outline.map((point) => inView(point, view.camera, view.size));
  return (
    <View style={styles.layer}>
      <Svg height={view.size.height} width={view.size.width}>
        {zones.map(({ id, outline }) => (
          <Path
            d={pathOf(placed(outline), true)}
            fill={color.private}
            fillOpacity={0.22}
            key={id}
            stroke={color.private}
            strokeWidth={2}
            testID="saved-zone"
          />
        ))}
        {stroke === null && unsaved !== null ? (
          <Path
            d={pathOf(placed(unsaved), true)}
            fill={color.private}
            fillOpacity={0.16}
            stroke={color.private}
            strokeDasharray="6 4"
            strokeWidth={2}
            testID="unsaved-zone"
          />
        ) : null}
        {stroke === null ? null : (
          <Path
            d={pathOf(stroke, false)}
            fill="none"
            stroke={color.private}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
        )}
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
