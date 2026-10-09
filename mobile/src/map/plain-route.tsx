/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { radius } from '@/design-system';
import type { Point } from './projection';
import type { LineStyle } from './types';

interface Stroke {
  // Its middle, its length without the round ends, and its turn.
  at: Point;
  length: number;
  angle: number;
}

function strokeBetween(from: Point, to: Point): Stroke {
  return {
    at: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
    length: Math.hypot(to.x - from.x, to.y - from.y),
    angle: Math.atan2(to.y - from.y, to.x - from.x),
  };
}

// The dashes of a line through the points, each of `length` after a gap of `gap`, counted along the whole line as
// SVG's `stroke-dasharray` counts them. A dash is not bent around a corner: it keeps the turn of the stretch its
// middle is on.
function dashesAlong(points: readonly Point[], [length, gap]: readonly [number, number]): Stroke[] {
  const dashes: Stroke[] = [];
  const every = length + gap;
  if (every <= 0) {
    return dashes;
  }
  // How far along the whole line the next dash's middle is, and where the stretch at hand starts.
  let next = length / 2;
  let walked = 0;
  for (const [index, to] of points.slice(1).entries()) {
    const from = points[index] ?? to;
    const stretch = strokeBetween(from, to);
    for (; next <= walked + stretch.length; next += every) {
      const along = stretch.length === 0 ? 0 : (next - walked) / stretch.length;
      const at = { x: from.x + (to.x - from.x) * along, y: from.y + (to.y - from.y) * along };
      dashes.push({ at, length, angle: stretch.angle });
    }
    walked += stretch.length;
  }
  return dashes;
}

function placed({ at, length, angle }: Stroke, { color: fill, width }: LineStyle): ViewStyle {
  return {
    left: at.x - (length + width) / 2,
    top: at.y - width / 2,
    width: length + width,
    height: width,
    backgroundColor: fill,
    transform: [{ rotate: `${angle}rad` }],
  };
}

// A line on the plain ground, with round ends: a straight stroke between each two points, or the dashes of a dashed
// look, and its words for a screen reader. Its strokes are under `line:{id}`.
export function PlainLine({
  id,
  points,
  look,
}: {
  id: string;
  points: readonly Point[];
  look: LineStyle;
}): ReactElement {
  const strokes =
    look.dash === undefined
      ? points.slice(1).map((to, index) => strokeBetween(points[index] ?? to, to))
      : dashesAlong(points, look.dash);
  return (
    <View style={styles.line} testID={`line:${id}`}>
      <View accessibilityLabel="경로가 그려져 있습니다" accessibilityRole="image" accessible style={styles.unseen} />
      {strokes.map((stroke) => (
        <View
          key={`${stroke.at.x}:${stroke.at.y}:${stroke.angle}`}
          style={[styles.stroke, placed(stroke, look)]}
          testID="route-stroke"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  // In the tree for a screen reader, and too small to see.
  unseen: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'hidden' },
  stroke: { position: 'absolute', borderRadius: radius.full, pointerEvents: 'none' },
});
