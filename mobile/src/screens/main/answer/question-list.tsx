/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { type QuestionRow, questionRows } from '@/features/assistant/turn-outcome';
import { turnOf } from '@/features/assistant/turn';
import type { ChatSheetControl } from '../chat-sheet';

const HEADER = '물은 것 · 누르면 그 답이 지도로 돌아와요';
const ON_SCREEN = '지금';
// The time's column, as wide as "00:00", so that the questions stand in line.
const TIME_WIDTH = 48;

interface QuestionListProps {
  rows: readonly QuestionRow[];
  // A question pressed: its turn on the map, in its conversation.
  onPick: (row: QuestionRow) => void;
  // The most the list's card takes; it scrolls beyond.
  maxHeight: number;
  // In the answer's card: no card of its own around it.
  flat?: boolean;
  // In place of the header's words.
  title?: string;
  // Under the rows, outside their scroll.
  footer?: ReactNode;
}

function Question({ row, onPress }: { row: QuestionRow; onPress: () => void }): ReactElement {
  const label = [row.time, row.asked, row.outcome, row.onScreen ? ON_SCREEN : ''].filter((part) => part !== '');
  return (
    <Pressable
      accessibilityLabel={label.join(', ')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID="question-row"
    >
      <Text style={[styles.time, styles.timeWords]}>{row.time}</Text>
      <View style={styles.words}>
        <Text numberOfLines={1} style={styles.asked}>
          {row.asked}
        </Text>
        {row.outcome === '' ? null : (
          <Text numberOfLines={1} style={styles.outcome}>
            {row.outcome}
          </Text>
        )}
      </View>
      {row.onScreen ? (
        <Text style={styles.now}>{ON_SCREEN}</Text>
      ) : (
        <Icon color={color.inkMuted} name="chevronRight" size={16} />
      )}
    </Pressable>
  );
}

// Every question of the conversations kept while the app runs, the latest first, each with when it was asked and
// what it came to (board 16); the turn on screen is marked 지금 (board 9). A press brings that answer back to the map.
// In the answer's card it is flat, above the input (board 6 of the 2026-11-22 redesign).
export function QuestionList(props: QuestionListProps): ReactElement {
  const { rows, onPick, maxHeight, flat = false, title = HEADER, footer = null } = props;
  return (
    <View style={[flat ? styles.flat : styles.card, { maxHeight }]} testID="question-list">
      <Text style={[styles.header, flat && styles.flatHeader]}>{title}</Text>
      <ScrollView contentContainerStyle={!flat && styles.rows} keyboardShouldPersistTaps="handled">
        {rows.map((row) => (
          <Question
            key={row.turnId}
            onPress={() => {
              onPick(row);
            }}
            row={row}
          />
        ))}
      </ScrollView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: space[4],
    paddingBottom: space[2],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  flat: { flexShrink: 1 },
  header: { ...text.caption, paddingHorizontal: space[4], paddingBottom: space[2], color: color.inkMuted },
  flatHeader: { paddingHorizontal: 0, paddingBottom: space[1] },
  rows: { paddingHorizontal: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    paddingVertical: space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.md,
  },
  pressed: { opacity: 0.6 },
  time: { width: TIME_WIDTH, alignItems: 'center' },
  timeWords: { ...text.label, color: color.inkMuted, textAlign: 'center' },
  words: { flex: 1, minWidth: 0, gap: 2 },
  asked: { ...text.label, color: color.ink },
  outcome: { ...text.caption, color: color.inkMuted },
  now: { ...text.label, color: color.snuBlue },
});

// Where the list stands and how much it may take, over the map.
export const QUESTION_LIST = { side: space[4], gap: space[2], share: 0.6 } as const;

// The rows of the list for the conversations a control keeps, the turn on screen marked.
export function questionRowsOf(control: ChatSheetControl): QuestionRow[] {
  return questionRows({
    current: control.said,
    earlier: control.chat.earlier,
    outcomes: control.outcomes,
    waiting: control.asking,
    onScreen: control.framed ? (turnOf(control.chat.bubbles)?.id ?? null) : null,
  });
}
