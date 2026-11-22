/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { Mention } from '@/api/mention-types';
import { color } from '@/design-system';
import { mentionParts, placedIn } from '@/features/assistant/mentions';

// A message the User sent, shown back with each "@이름" it mentions in the Friend colour, as the input drew it. Put
// inside a Text, which keeps its own style and line count.
export function MentionWords({ words, mentions }: { words: string; mentions: readonly Mention[] }): ReactElement {
  const parts = mentionParts({ text: words, placed: placedIn(words, mentions) });
  return (
    <>
      {parts.map(({ words: part, mention }, index) =>
        mention ? (
          // oxlint-disable-next-line react/no-array-index-key -- the parts are the words in order
          <Text key={index} style={styles.mention}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  mention: { color: color.friend, fontWeight: '600' },
});
