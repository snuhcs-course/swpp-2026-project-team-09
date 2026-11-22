/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, type TextLayoutEvent, View } from 'react-native';
import { color, font, text } from '@/design-system';
import { type BandWordsPart, shortenedOf } from '@/features/assistant/band-words';

// What the bar's head keeps clear at each side of its words: "←" at the left, "＋ 같이" at the right.
export interface HeadRoom {
  left: number;
  right: number;
  // The head row's least height: that of "＋ 같이", whose middle the words share, so that the track starts below it
  // (P04 ticket 43). Left out, the words' own.
  height?: number;
}

interface BandWordsProps {
  parts: readonly BandWordsPart[];
  day: string;
  // In a bar's head, the words stand at the left between its buttons, shortened before the right one; else centred.
  head?: HeadRoom;
}

// The last step `shortenedOf` takes: without the length and the meal's name.
const LAST_STEP = 2;

function Words({ day, parts }: { day: string; parts: readonly BandWordsPart[] }): ReactElement {
  return (
    <>
      {day === '' ? null : `${day} `}
      {parts.map(({ text: part, strong }, at) =>
        strong ? (
          <Text key={`${at}-${part}`} style={styles.strong}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  );
}

// How far the words are shortened to stand on one line: a hidden copy of them, at the same width without a line's
// limit, says when they would take two, and the next step is tried. The steps start again when the words change.
function useFittedStep(key: string): {
  step: number;
  onLayout: (event: TextLayoutEvent) => void;
} {
  const [fit, setFit] = useState({ key, step: 0 });
  const step = fit.key === key ? fit.step : 0;
  return {
    step,
    onLayout: ({ nativeEvent }) => {
      if (nativeEvent.lines.length > 1 && step < LAST_STEP) {
        setFit({ key, step: step + 1 });
      }
    },
  };
}

// The band's words with the day before them, the dragged end's time in the stronger weight. In a bar's head they stand
// on one line between "←" and "＋ 같이": too long for it, they drop the length first, then the meal's name, and only
// then are they cut (P04 ticket 37).
export function BandWords({ parts, day, head }: BandWordsProps): ReactElement {
  const room =
    head === undefined ? null : { paddingLeft: head.left, paddingRight: head.right, textAlign: 'left' as const };
  const key = `${day}|${parts.map(({ text: part }) => part).join('')}`;
  const { step, onLayout } = useFittedStep(key);
  const shown = head === undefined ? { day, parts } : shortenedOf(day, parts, step);
  return (
    <View
      style={head?.height === undefined ? undefined : [styles.head, { minHeight: head.height }]}
      testID={head?.height === undefined ? undefined : 'time-band-head'}
    >
      <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.words, room]} testID="time-band-words">
        <Words day={shown.day} parts={shown.parts} />
      </Text>
      {head === undefined || step >= LAST_STEP ? null : (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onTextLayout={onLayout}
          style={[styles.words, room, styles.measure]}
          testID="time-band-words-measure"
        >
          <Words day={shown.day} parts={shown.parts} />
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  words: { ...text.label, color: color.quest, textAlign: 'center' },
  strong: { fontFamily: font.bold },
  head: { justifyContent: 'center' },
  // Laid out at the words' width, unseen and untouchable, only to count its lines.
  measure: { position: 'absolute', top: 0, right: 0, left: 0, opacity: 0, pointerEvents: 'none' },
});
