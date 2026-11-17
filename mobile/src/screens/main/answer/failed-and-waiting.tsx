/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { WaitingDots } from '@/design-system';
import { RoundButton } from './close-button';
import { ReplyLines } from './refusal-reply';

// The answer card while there is no answer (row 8, n16 and n18): a request that failed, and the reply on its way.

// A failure's words, a line each.
export function FailedLines({ text }: { text: string }): ReactElement {
  return <ReplyLines lines={text.split('\n').map((line) => [{ text: line, strong: false }])} />;
}

// The dots ("보는 중") and 그만, which takes the question back. What is being read is not listed: the server answers
// once at the end and says nothing of its steps.
export function WaitingReply({ onStop }: { onStop: () => void }): ReactElement {
  return (
    <View style={styles.waiting} testID="answer-waiting">
      <WaitingDots label="보는 중" />
      <RoundButton filled icon="stop" label="그만" onPress={onStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
