/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnswerLine } from '@/api/assistant-types';
import { color, font, Icon, space, text } from '@/design-system';
import { EdgeText } from './row-edges';

const ICON = 16;

// The lines the server wrote for an answer, at most three: each a run of words, the strong ones bold in the key colour.
// A `way`, a received invitation's, reads as body text after the route arrow, its strong words semibold.
export function AnswerLines({ lines, way = false }: { lines: readonly AnswerLine[]; way?: boolean }): ReactElement {
  const look = way ? WAY : ANSWER;
  const drawn = lines.map((line, row) => (
    // The lines have no id, and their order is their meaning.
    // oxlint-disable-next-line react/no-array-index-key
    <EdgeText key={row} style={look.line}>
      {line.map(({ text: words, strong }, part) => (
        // oxlint-disable-next-line react/no-array-index-key
        <Text key={part} style={strong ? look.strong : undefined}>
          {words}
        </Text>
      ))}
    </EdgeText>
  ));
  if (!way) {
    return <View testID="answer-lines">{drawn}</View>;
  }
  return (
    <View style={styles.way} testID="answer-lines">
      <View style={styles.icon}>
        <Icon name="route" size={ICON} testID="way-icon" />
      </View>
      <View style={styles.wayLines}>{drawn}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { ...text.title, color: color.ink },
  strong: { fontFamily: font.bold, color: color.snuBlue },
  way: { flexDirection: 'row', gap: space[2] },
  // As high as the first line, so that the arrow stands at its middle.
  icon: { height: text.body.lineHeight, justifyContent: 'center' },
  wayLines: { flex: 1 },
  wayLine: { ...text.body, color: color.ink },
  wayStrong: { fontFamily: font.semiBold, color: color.snuBlue },
});

const ANSWER = { line: styles.line, strong: styles.strong };
const WAY = { line: styles.wayLine, strong: styles.wayStrong };
