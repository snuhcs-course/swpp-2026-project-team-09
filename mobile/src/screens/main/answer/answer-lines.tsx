/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnswerLine } from '@/api/assistant-types';
import { color, font, text } from '@/design-system';

// The lines the server wrote for an answer, at most two: each a run of words, the strong ones bold in the key colour.
export function AnswerLines({ lines }: { lines: readonly AnswerLine[] }): ReactElement {
  return (
    <View testID="answer-lines">
      {lines.map((line, row) => (
        // The lines have no id, and their order is their meaning.
        // oxlint-disable-next-line react/no-array-index-key
        <Text key={row} style={styles.line}>
          {line.map(({ text: words, strong }, part) => (
            // oxlint-disable-next-line react/no-array-index-key
            <Text key={part} style={strong ? styles.strong : undefined}>
              {words}
            </Text>
          ))}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { ...text.bodyLg, fontFamily: font.semiBold, fontSize: 17, color: color.ink },
  strong: { fontFamily: font.bold, color: color.snuBlue },
});
