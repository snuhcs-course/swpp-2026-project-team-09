/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { type QuestionRow, questionRows } from '@/features/assistant/turn-outcome';
import { turnOf } from '@/features/assistant/turn';
import type { ChatSheetControl } from '../chat-sheet';
import { ANSWER_PILL, listsTop } from '../layout';

export const NEW_CHAT = '새 대화';
const NEW_CHAT_NOTE = '지금 대화는 지워지지 않고 아래에 남아요';
const HEADER = '물은 것 · 누르면 그 답이 지도로 돌아와요';
const ON_SCREEN = '지금';
// The time's column, as wide as "00:00", so that the questions stand in line.
const TIME_WIDTH = 48;

interface QuestionListProps {
  rows: readonly QuestionRow[];
  // A question pressed: its turn on the map, in its conversation.
  onPick: (row: QuestionRow) => void;
  // The list's first row, "새 대화"; left out where the conversation is already a new one.
  onNew?: () => void;
  // The most the list's card takes; it scrolls beyond.
  maxHeight: number;
}

function NewChatRow({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`${NEW_CHAT}, ${NEW_CHAT_NOTE}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.newRow, pressed && styles.pressed]}
    >
      <View style={styles.time}>
        <Icon color={color.inkMuted} name="plus" size={16} />
      </View>
      <View style={styles.words}>
        <Text style={styles.asked}>{NEW_CHAT}</Text>
        <Text numberOfLines={1} style={styles.outcome}>
          {NEW_CHAT_NOTE}
        </Text>
      </View>
      <Icon color={color.snuBlue} name="chevronRight" size={16} />
    </Pressable>
  );
}

function Question({ row, onPress }: { row: QuestionRow; onPress: () => void }): ReactElement {
  const label = [row.time, row.asked, row.outcome, row.onScreen ? ON_SCREEN : ''].filter((part) => part !== '');
  return (
    <Pressable
      accessibilityLabel={label.join(', ')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, row.onScreen && styles.onScreen, pressed && styles.pressed]}
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
// what it came to (board 16), under "새 대화"; the turn on screen is marked 지금 (board 9). A press brings that answer
// back to the map.
export function QuestionList({ rows, onPick, onNew, maxHeight }: QuestionListProps): ReactElement {
  return (
    <View style={[styles.card, { maxHeight }]} testID="question-list">
      <Text style={styles.header}>{HEADER}</Text>
      <ScrollView contentContainerStyle={styles.rows} keyboardShouldPersistTaps="handled">
        {onNew === undefined ? null : <NewChatRow onPress={onNew} />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  over: { position: 'absolute', right: space[4], left: space[4] },
  card: {
    paddingTop: space[4],
    paddingBottom: space[2],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  header: { ...text.caption, paddingHorizontal: space[4], paddingBottom: space[2], color: color.inkMuted },
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
  newRow: { backgroundColor: color.surfaceSunken },
  onScreen: { backgroundColor: color.surfaceSunken },
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

interface FrameQuestionsProps {
  control: ChatSheetControl;
  // Closes the list, after a question was picked.
  onDone: () => void;
  onNew: () => void;
  stageHeight: number | null;
}

// The list under the answer's pill (board 16), over the time bar and the map: "새 대화" first, then the questions.
export function FrameQuestions({ control, onDone, onNew, stageHeight }: FrameQuestionsProps): ReactElement {
  const { top } = useSafeAreaInsets();
  const at = listsTop(top) + ANSWER_PILL.height + QUESTION_LIST.gap;
  return (
    <View style={[styles.over, { top: at }]}>
      <QuestionList
        maxHeight={stageHeight === null ? FALLBACK_MAX : stageHeight * QUESTION_LIST.share}
        onNew={onNew}
        onPick={(row) => {
          onDone();
          control.showTurn(row.turnId, row.conversation);
        }}
        rows={questionRowsOf(control)}
      />
    </View>
  );
}

const FALLBACK_MAX = 420;
