/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnswerLine } from '@/api/assistant-types';
import { Button, space } from '@/design-system';
import { AnswerLines } from './answer-lines';

interface TakenCardProps {
  lines: readonly AnswerLine[];
  onAgain: () => void;
  onClose: () => void;
}

// The card of a meal's Plan taken alone with "여기로" (boards s4 and s4b): where the User goes and whether they will be
// told when to leave, with "다시 고르기" and "닫기" side by side.
export function TakenCard({ lines, onAgain, onClose }: TakenCardProps): ReactElement {
  return (
    <View style={styles.card} testID="taken-card">
      <AnswerLines lines={lines} />
      <View style={styles.buttons}>
        <View style={styles.cell}>
          <Button full onPress={onAgain} variant="secondary">
            다시 고르기
          </Button>
        </View>
        <View style={styles.cell}>
          <Button full onPress={onClose} variant="secondary">
            닫기
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  buttons: { flexDirection: 'row', gap: space[2] },
  cell: { flex: 1 },
});
