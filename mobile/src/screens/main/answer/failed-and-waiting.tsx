/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, space } from '@/design-system';
import { ReplyLines } from './refusal-reply';

// The answer card while there is no answer (row 8, n16 and n18): a request that failed, and the reply on its way.

// A failure's words, a line each.
export function FailedLines({ text }: { text: string }): ReactElement {
  return <ReplyLines lines={text.split('\n').map((line) => [{ text: line, strong: false }])} />;
}

// "보는 중" and 그만, which does what the pill's ✕ does. What is being read is not listed: the server answers once at
// the end and says nothing of its steps.
export function WaitingReply({ onStop }: { onStop: () => void }): ReactElement {
  return (
    <View style={styles.waiting} testID="answer-waiting">
      <ReplyLines lines={[[{ text: '보는 중', strong: false }]]} />
      <View style={styles.stop}>
        <Button onPress={onStop} variant="secondary">
          그만
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  waiting: { gap: space[3] },
  stop: { alignItems: 'flex-start' },
});
