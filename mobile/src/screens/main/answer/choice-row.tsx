/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, font, space, text } from '@/design-system';

// A choice of the answer's main row: what it says, what it does, and whether it waits.
export interface Choice {
  words: string;
  onPress: () => void;
  disabled: boolean;
}

// A `bar` button's room for its words: its padding of 20 at each side and its border of 1.
const BUTTON_SIDES = 2 * space[5] + 2;

// Whether both words fit on one line in half of `row`, less the gap, as measured; true until all three are measured.
export function bothFit(row: number, words: readonly (number | undefined)[]): boolean {
  if (row <= 0 || words.some((width) => width === undefined)) {
    return true;
  }
  const room = (row - space[2]) / 2 - BUTTON_SIDES;
  return words.every((width) => (width ?? 0) <= room);
}

// The words laid out at their own width, unseen, in a `bar` button's type, which tells that width.
function Measure({ words, onWidth }: { words: string; onWidth: (width: number) => void }): ReactElement {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onTextLayout={({ nativeEvent }) => {
        onWidth(Math.max(0, ...nativeEvent.lines.map(({ width }) => width)));
      }}
      style={styles.measure}
      testID="choice-measure"
    >
      {words}
    </Text>
  );
}

// A secondary choice and the main one on one row above the input (P04 ticket 50): the secondary at the left as an
// outline button, the main at the right filled, in two equal cells of the input's height. Where either's words do not
// fit their cell on one line at the phone's font size, as measured, they stand on two rows: the secondary's, then the
// main's, each full width.
export function ChoiceRow({ secondary, main }: { secondary: Choice; main: Choice }): ReactElement {
  const [row, setRow] = useState(0);
  const [widths, setWidths] = useState<{ secondary?: number; main?: number }>({});
  const oneRow = bothFit(row, [widths.secondary, widths.main]);
  return (
    <View
      onLayout={({ nativeEvent }) => {
        setRow(nativeEvent.layout.width);
      }}
      style={oneRow ? styles.oneRow : styles.twoRows}
      testID="answer-choices"
    >
      <Measure
        onWidth={(width) => {
          setWidths((last) => ({ ...last, secondary: width }));
        }}
        words={secondary.words}
      />
      <Measure
        onWidth={(width) => {
          setWidths((last) => ({ ...last, main: width }));
        }}
        words={main.words}
      />
      <View style={oneRow ? styles.cell : undefined}>
        <Button disabled={secondary.disabled} full onPress={secondary.onPress} size="bar" variant="secondary">
          {secondary.words}
        </Button>
      </View>
      <View style={oneRow ? styles.cell : undefined}>
        <Button disabled={main.disabled} full onPress={main.onPress} size="bar">
          {main.words}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  oneRow: { flexDirection: 'row', gap: space[2] },
  twoRows: { gap: space[2] },
  cell: { flex: 1, minWidth: 0 },
  // A `bar` button's label type (`Button`'s `labelLg`), laid out unseen at its own width.
  measure: {
    ...text.bodyLg,
    position: 'absolute',
    top: 0,
    left: 0,
    fontFamily: font.semiBold,
    opacity: 0,
    pointerEvents: 'none',
  },
});
