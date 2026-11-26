/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useId, useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { SkippedClass } from '@/api/time-band-types';
import { color, font, radius, space, text } from '@/design-system';
import { clockOf, type Stretch } from '@/features/assistant/time-band';
import { placeOf } from './band-body';

// The asker's Classes left out of a meal's plan (P04 ticket 93, the design's option 다): each a dashed empty block
// on the asker's lane where its grey block was, and, under the time card's ends, one line "뺀 수업" with a pill for each,
// whose ✕ puts that Class back. The title row and the ends' row stay as they are.

const PILL_PAD = 2;
const FADE_WIDTH = 32;

// The line's height, its gap above it included: the card is this much taller while it shows (`foldedTimeCardOf`).
export function skippedLineOf(fontScale: number): number {
  return space[1] + text.caption.lineHeight * fontScale + 2 * PILL_PAD + 2;
}

// The dashed blocks of the Classes left out that lie in the range; none outside it, as on a folded track.
export function SkippedBlocks(p: { skipped: readonly SkippedClass[] | undefined; range: Stretch }): ReactElement {
  const shown = (p.skipped ?? []).filter(
    ({ startAt, endAt }) => new Date(startAt) < new Date(p.range.endAt) && new Date(endAt) > new Date(p.range.startAt),
  );
  return (
    <>
      {shown.map((skipped) => (
        <View key={skipped.id} style={[styles.block, placeOf(skipped, p.range)]} testID="time-band-skipped" />
      ))}
    </>
  );
}

// A fade from the card's white over one end of the line of pills, where more lie beyond it.
function EdgeFade({ side }: { side: 'left' | 'right' }): ReactElement {
  // Unique on the page, and only letters, digits, `_` and `-`, as an SVG `url(#…)` needs.
  const id = `skipped-fade${useId().replaceAll(/[^\w-]/gu, '')}`;
  return (
    <Svg
      height="100%"
      pointerEvents="none"
      style={[styles.fade, side === 'left' ? styles.fadeLeft : styles.fadeRight]}
      testID={`time-band-skipped-fade-${side}`}
      width={FADE_WIDTH}
    >
      <Defs>
        <LinearGradient id={id} x1={side === 'left' ? '0' : '1'} x2={side === 'left' ? '1' : '0'} y1="0" y2="0">
          <Stop offset="0" stopColor={color.surface} stopOpacity={1} />
          <Stop offset="1" stopColor={color.surface} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect fill={`url(#${id})`} height="100%" width={FADE_WIDTH} />
    </Svg>
  );
}

interface LineProps {
  skipped: readonly SkippedClass[] | undefined;
  // Puts that Class back, by the id of its time; left out, the pills take no press.
  onPutBack?: (classId: string) => void;
  disabled: boolean;
}

// What of the pills lies beyond each end of the line.
interface Beyond {
  left: boolean;
  right: boolean;
}

// The line under the ends, while a Class is left out: "뺀 수업" in place, and the pills after it in a row that alone
// scrolls sideways when they do not fit, fading at the end that has more.
export function SkippedLine({ skipped = [], onPutBack, disabled }: LineProps): ReactElement | null {
  const [width, setWidth] = useState(0);
  const [content, setContent] = useState(0);
  const [offset, setOffset] = useState(0);
  if (skipped.length === 0) {
    return null;
  }
  const beyond: Beyond = { left: offset > 1, right: content - width - offset > 1 };
  return (
    <View style={styles.line} testID="time-band-skipped-line">
      <Text style={styles.label}>뺀 수업</Text>
      <View style={styles.room}>
        <ScrollView
          contentContainerStyle={styles.pills}
          horizontal
          onContentSizeChange={(contentWidth) => {
            setContent(contentWidth);
          }}
          onLayout={({ nativeEvent }: LayoutChangeEvent) => {
            setWidth(nativeEvent.layout.width);
          }}
          onScroll={({ nativeEvent }) => {
            setOffset(nativeEvent.contentOffset.x);
          }}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          testID="time-band-skipped-pills"
        >
          {skipped.map((one) => (
            <Pressable
              accessibilityLabel={`${clockOf(one.startAt)} ${one.label} 다시 넣기`}
              accessibilityRole="button"
              accessibilityState={{ disabled: disabled || onPutBack === undefined }}
              disabled={disabled || onPutBack === undefined}
              key={one.id}
              onPress={() => {
                onPutBack?.(one.id);
              }}
              style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            >
              <Text style={styles.pillWords}>{`${clockOf(one.startAt)} ✕`}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {beyond.left ? <EdgeFade side="left" /> : null}
        {beyond.right ? <EdgeFade side="right" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    top: 1,
    bottom: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    borderRadius: radius.full,
    backgroundColor: color.surface,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  label: { ...text.caption, color: color.inkSubtle },
  room: { flex: 1 },
  pills: { flexDirection: 'row', gap: space[1] + 2 },
  pill: {
    paddingHorizontal: space[3],
    paddingVertical: PILL_PAD,
    borderWidth: 1,
    borderColor: color.surfaceSunken,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
  pillWords: { ...text.caption, fontFamily: font.semiBold, color: color.snuBlue },
  pressed: { opacity: 0.6 },
  fade: { position: 'absolute', top: 0, bottom: 0 },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },
});
