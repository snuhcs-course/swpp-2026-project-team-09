/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Button, color, space, text } from '@/design-system';

export type OffAnswer = 'off' | 'building' | 'cancel';

const ANSWERS: readonly { answer: OffAnswer; words: string }[] = [
  { answer: 'off', words: '위치 끄기' },
  { answer: 'building', words: '건물까지만' },
  { answer: 'cancel', words: '취소' },
];

interface OffQuestionProps {
  // The Friend asked about, or null for every Friend, as before the Master Switch is turned off.
  name: string | null;
  open: boolean;
  // Closing the sheet is 취소.
  onAnswer: (answer: OffAnswer) => void;
}

// The question before location is turned off the first time, in the design's words: the building could be shown
// instead, and nothing reaches the Friend either way. The three answers are cells of one width.
export function OffQuestion({ name, open, onAnswer }: OffQuestionProps): ReactElement {
  const whom = name ?? '모든 친구';
  return (
    <BottomSheet
      label="위치 끄기"
      onClose={() => {
        onAnswer('cancel');
      }}
      open={open}
    >
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {`${whom}에게는 지금 있는 건물만 보여 줄 수도 있어요.`}
        </Text>
        <Text style={styles.words}>{`어느 쪽을 골라도 ${name ?? '친구'}에게는 아무 표시도 가지 않아요.`}</Text>
        <View style={styles.answers}>
          {ANSWERS.map(({ answer, words }) => (
            <View key={answer} style={styles.answer}>
              <Button
                full
                onPress={() => {
                  onAnswer(answer);
                }}
                variant="secondary"
              >
                {words}
              </Button>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>시간표는 계속 보여요</Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[5] },
  title: { ...text.title, color: color.ink },
  words: { ...text.body, color: color.inkMuted },
  answers: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
  answer: { flex: 1 },
  footer: { ...text.caption, color: color.inkMuted, textAlign: 'center' },
});
