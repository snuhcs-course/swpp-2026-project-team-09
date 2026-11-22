/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { type QuestionRow, questionRows } from '@/features/assistant/turn-outcome';
import { turnOf } from '@/features/assistant/turn';
import type { ChatSheetControl } from '../chat-sheet';

const TITLE = '이전 질문';
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
  // "＋ 새 질문" at the header's right; none without it.
  onAskNew?: () => void;
  // "모두 지우기" on the earlier conversations' group, once the User says 지우기.
  onClearEarlier: () => void;
}

// The rows in two groups, each latest first: the current conversation's, and the kept conversations' (P04 ticket 49).
export function groupsOf(rows: readonly QuestionRow[]): { now: QuestionRow[]; earlier: QuestionRow[] } {
  return {
    now: rows.filter(({ conversation }) => conversation === null),
    earlier: rows.filter(({ conversation }) => conversation !== null),
  };
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

// A small word button at a row's right: "＋ 새 질문", "모두 지우기", 지우기 and 취소.
function WordButton(props: { words: string; label?: string; onPress: () => void; strong?: boolean }): ReactElement {
  const { words, label = words, onPress, strong = false } = props;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={space[2]}
      onPress={onPress}
      style={({ pressed }) => [styles.wordButton, pressed && styles.pressed]}
    >
      <Text style={[styles.wordButtonWords, strong && styles.strong]}>{words}</Text>
    </Pressable>
  );
}

// The earlier conversations' header: its name and "모두 지우기", which turns it into the question whether to erase them,
// in the row itself: no dialog. The current conversation stays, what "이어서 말하기" goes on from.
function EarlierHeader({ count, onClear }: { count: number; onClear: () => void }): ReactElement {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <View style={styles.groupRow}>
        <Text style={styles.group}>이전 대화</Text>
        <WordButton
          onPress={() => {
            setAsking(true);
          }}
          words="모두 지우기"
        />
      </View>
    );
  }
  return (
    <View style={[styles.groupRow, styles.asking]} testID="clear-earlier-question">
      <Text style={styles.question}>{`이전 대화의 질문 ${String(count)}개를 지울까요?`}</Text>
      <View style={styles.answers}>
        <WordButton
          onPress={() => {
            setAsking(false);
          }}
          words="취소"
        />
        <WordButton onPress={onClear} strong words="지우기" />
      </View>
    </View>
  );
}

// Every question of the conversations kept while the app runs (board 16), under the title "이전 질문" with "＋ 새 질문"
// always in reach at its right, outside the scroll (P04 ticket 49). The current conversation's questions come first
// ("지금 대화"), then the kept ones' ("이전 대화", with "모두 지우기"), each latest first, with when each was asked and what
// it came to; the turn on screen is marked 지금 (board 9). A press brings that answer back to the map. In the answer's
// card it is flat (board 6 of the 2026-11-22 redesign).
export function QuestionList(props: QuestionListProps): ReactElement {
  const { rows, onPick, maxHeight, flat = false, onAskNew, onClearEarlier } = props;
  const { now, earlier } = groupsOf(rows);
  const question = (row: QuestionRow): ReactElement => (
    <Question
      key={row.turnId}
      onPress={() => {
        onPick(row);
      }}
      row={row}
    />
  );
  return (
    <View style={[flat ? styles.flat : styles.card, { maxHeight }]} testID="question-list">
      <View style={[styles.header, flat && styles.flatHeader]}>
        <Text style={styles.title}>{TITLE}</Text>
        {onAskNew === undefined ? null : <WordButton label="새 질문" onPress={onAskNew} strong words="＋ 새 질문" />}
      </View>
      <ScrollView contentContainerStyle={!flat && styles.rows} keyboardShouldPersistTaps="handled">
        {earlier.length > 0 && now.length > 0 ? <Text style={[styles.group, styles.groupRow]}>지금 대화</Text> : null}
        {now.map((row) => question(row))}
        {earlier.length === 0 ? null : <EarlierHeader count={earlier.length} onClear={onClearEarlier} />}
        {earlier.map((row) => question(row))}
      </ScrollView>
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
  // Words shorten or wrap inside their own row at a large font: nothing overlaps.
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingBottom: space[2],
  },
  flatHeader: { paddingHorizontal: 0, paddingBottom: space[1] },
  title: { ...text.caption, flexShrink: 1, color: color.inkMuted },
  groupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    minHeight: 36,
    paddingHorizontal: space[2],
    paddingTop: space[2],
  },
  group: { ...text.caption, flexShrink: 1, color: color.inkSubtle },
  asking: { paddingBottom: space[2], borderRadius: radius.md, backgroundColor: color.surfaceSunken },
  question: { ...text.label, flexShrink: 1, color: color.ink },
  answers: { flexDirection: 'row', gap: space[2], marginLeft: 'auto' },
  wordButton: { justifyContent: 'center', minHeight: 32, paddingHorizontal: space[2] },
  wordButtonWords: { ...text.label, color: color.inkMuted },
  strong: { color: color.snuBlue },
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
