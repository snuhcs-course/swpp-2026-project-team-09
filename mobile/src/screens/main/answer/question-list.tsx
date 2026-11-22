/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, Dialog, Icon, radius, shadow, space, text } from '@/design-system';
import { type QuestionRow, questionRows } from '@/features/assistant/turn-outcome';
import { turnOf } from '@/features/assistant/turn';
import type { ChatSheetControl } from '../chat-sheet';

const TITLE = '이전 질문';
// What a screen reader hears of the question on screen, which the row's tint shows.
const ON_SCREEN = '지금';
// The time's column, as wide as "00:00", so that the questions stand in line; the time starts at its left.
const TIME_WIDTH = 48;
// The title, the group names, the rows' times, and the words and marks at the right stand on the two lines of the
// sheet's own inset, with no side padding of their own (P04 ticket 49); over the map, the card's. A row's tint and
// press area reach this far past those lines, so that its words stay on them.
const BLEED = space[2];
// The touch area beyond words and marks at a row's right, about 44 square.
const WORD_SLOP = { top: 6, bottom: 6, left: space[3], right: space[3] };
const TRASH = 20;
const TRASH_SLOP = (44 - TRASH) / 2;

interface QuestionListProps {
  rows: readonly QuestionRow[];
  // A question pressed, or a kept conversation's row: its turn on the map, in its conversation.
  onPick: (row: QuestionRow) => void;
  // The most the list's card takes; it scrolls beyond.
  maxHeight: number;
  // In the answer's card: no card of its own around it.
  flat?: boolean;
  // "＋ 새 대화" at the header's right; none without it.
  onAskNew?: () => void;
  // "모두 지우기", once the User says 지우기 in its dialog.
  onClearEarlier: () => void;
  // A kept conversation's trash: erases it at once, by its id.
  onRemoveEarlier: (conversation: number) => void;
}

// A kept conversation as one row: its first question, how many it holds, and its last question's time, outcome and turn,
// which a press brings back.
export interface ConversationRow {
  conversation: number;
  first: string;
  count: number;
  last: QuestionRow;
}

// The current conversation's questions, latest first, and the kept conversations, each as one row, the latest first
// (P04 ticket 49).
export function groupsOf(rows: readonly QuestionRow[]): { now: QuestionRow[]; earlier: ConversationRow[] } {
  const byConversation = new Map<number, QuestionRow[]>();
  for (const row of rows) {
    if (row.conversation !== null) {
      byConversation.set(row.conversation, [...(byConversation.get(row.conversation) ?? []), row]);
    }
  }
  const earlier = [...byConversation].flatMap(([conversation, questions]): ConversationRow[] => {
    const inOrder = questions.toSorted((one, other) => one.turnId - other.turnId);
    const [first] = inOrder;
    const last = inOrder.at(-1);
    return first === undefined || last === undefined
      ? []
      : [{ conversation, first: first.asked, count: questions.length, last }];
  });
  return {
    now: rows.filter(({ conversation }) => conversation === null),
    earlier: earlier.toSorted((one, other) => other.last.turnId - one.last.turnId),
  };
}

// The second line of a kept conversation's row: "질문 3개 · 셔틀 두 대가 …", or just the outcome of a single question.
function conversationLine({ count, last }: ConversationRow): string {
  return count === 1
    ? last.outcome
    : [`질문 ${String(count)}개`, last.outcome].filter((part) => part !== '').join(' · ');
}

// A row's time, its two lines, and what stands at its right.
function RowWords({ time, first, second }: { time: string; first: string; second: string }): ReactElement {
  return (
    <>
      <Text numberOfLines={1} style={[styles.time, styles.timeWords]}>
        {time}
      </Text>
      <View style={styles.words}>
        <Text numberOfLines={1} style={styles.asked}>
          {first}
        </Text>
        {second === '' ? null : (
          <Text numberOfLines={1} style={styles.outcome}>
            {second}
          </Text>
        )}
      </View>
    </>
  );
}

// A question of the current conversation. The one on screen is tinted, with no mark at its right; the others have a
// chevron.
function Question({ row, onPress }: { row: QuestionRow; onPress: () => void }): ReactElement {
  const label = [row.time, row.asked, row.outcome, row.onScreen ? ON_SCREEN : ''].filter((part) => part !== '');
  return (
    <Pressable
      accessibilityLabel={label.join(', ')}
      accessibilityRole="button"
      accessibilityState={{ selected: row.onScreen }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, row.onScreen && styles.onScreen, pressed && styles.pressed]}
      testID="question-row"
    >
      <RowWords first={row.asked} second={row.outcome} time={row.time} />
      {row.onScreen ? null : <Icon color={color.inkMuted} name="chevronRight" size={16} />}
    </Pressable>
  );
}

// A kept conversation: a press takes it up again at its last turn; its trash erases it at once.
function Conversation(props: { row: ConversationRow; onPick: () => void; onRemove: () => void }): ReactElement {
  const { row, onPick, onRemove } = props;
  const second = conversationLine(row);
  const label = [row.last.time, row.first, second].filter((part) => part !== '').join(', ');
  return (
    <View style={styles.conversation}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPick}
        style={({ pressed }) => [styles.row, styles.conversationBody, pressed && styles.pressed]}
        testID="question-row"
      >
        <RowWords first={row.first} second={second} time={row.last.time} />
      </Pressable>
      <Pressable
        accessibilityLabel="이 대화 지우기"
        accessibilityRole="button"
        hitSlop={TRASH_SLOP}
        onPress={onRemove}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Icon color={color.inkMuted} name="trash" size={TRASH} />
      </Pressable>
    </View>
  );
}

// A small word button at a row's right: "＋ 새 대화" and "모두 지우기". Its words end at the row's right edge, as the
// rows' chevrons and the trash marks do; the touch area reaches past them.
function WordButton(props: { words: string; label?: string; onPress: () => void; strong?: boolean }): ReactElement {
  const { words, label = words, onPress, strong = false } = props;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={WORD_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.wordButton, pressed && styles.pressed]}
    >
      <Text style={[styles.wordButtonWords, strong && styles.strong]}>{words}</Text>
    </Pressable>
  );
}

// The kept conversations: their header with "모두 지우기", which asks in the app's own dialog, and one row each. The
// current conversation stays, what "이어서 말하기" goes on from.
function Earlier(
  props: Pick<QuestionListProps, 'onPick' | 'onClearEarlier' | 'onRemoveEarlier'> & {
    rows: readonly ConversationRow[];
  },
): ReactElement {
  const { rows, onPick, onClearEarlier, onRemoveEarlier } = props;
  const [asking, setAsking] = useState(false);
  return (
    <>
      <View style={styles.groupRow}>
        <Text style={styles.group}>이전 대화</Text>
        <WordButton
          onPress={() => {
            setAsking(true);
          }}
          words="모두 지우기"
        />
      </View>
      {rows.map((row) => (
        <Conversation
          key={row.conversation}
          onPick={() => {
            onPick(row.last);
          }}
          onRemove={() => {
            onRemoveEarlier(row.conversation);
          }}
          row={row}
        />
      ))}
      <Dialog
        body="지금 대화는 그대로 남아요."
        cancelLabel="취소"
        confirmLabel="지우기"
        onCancel={() => {
          setAsking(false);
        }}
        onConfirm={() => {
          setAsking(false);
          onClearEarlier();
        }}
        title="이전 대화를 모두 지울까요?"
        tone="danger"
        visible={asking}
      />
    </>
  );
}

// Every question of the conversations kept while the app runs (board 16), under the title "이전 질문" with "＋ 새 대화"
// always in reach at its right, outside the scroll (P04 ticket 49). The current conversation's questions come first
// ("지금 대화"), each with when it was asked and what it came to, the one on screen tinted (board 9). The kept
// conversations follow ("이전 대화"), one row each. A press brings that answer back to the map. In the answer's card
// it is flat (board 6 of the 2026-11-22 redesign).
export function QuestionList(props: QuestionListProps): ReactElement {
  const { rows, onPick, maxHeight, flat = false, onAskNew, onClearEarlier, onRemoveEarlier } = props;
  const { now, earlier } = groupsOf(rows);
  return (
    <View style={[flat ? styles.flat : styles.card, { maxHeight }]} testID="question-list">
      <View style={[styles.header, flat && styles.flatHeader]}>
        <Text style={styles.title}>{TITLE}</Text>
        {/* In the card, the card's own header holds "＋ 새 대화" (P04 ticket 52): the flat form shows none. */}
        {onAskNew === undefined || flat ? null : (
          <WordButton label="새 대화" onPress={onAskNew} strong words="＋ 새 대화" />
        )}
      </View>
      <ScrollView contentContainerStyle={!flat && styles.rows} keyboardShouldPersistTaps="handled">
        {earlier.length > 0 && now.length > 0 ? <Text style={[styles.group, styles.groupRow]}>지금 대화</Text> : null}
        {now.map((row) => (
          <Question
            key={row.turnId}
            onPress={() => {
              onPick(row);
            }}
            row={row}
          />
        ))}
        {earlier.length === 0 ? null : (
          <Earlier onClearEarlier={onClearEarlier} onPick={onPick} onRemoveEarlier={onRemoveEarlier} rows={earlier} />
        )}
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
    paddingTop: space[2],
  },
  group: { ...text.caption, flexShrink: 1, color: color.inkSubtle },
  onScreen: { backgroundColor: color.blue50 },
  conversation: { flexDirection: 'row', alignItems: 'center' },
  conversationBody: { flex: 1, minWidth: 0, marginRight: 0, paddingRight: space[2] },
  wordButton: { justifyContent: 'center', minHeight: 32 },
  wordButtonWords: { ...text.label, color: color.inkMuted },
  strong: { color: color.snuBlue },
  rows: { paddingHorizontal: space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 56,
    paddingVertical: space[2],
    paddingHorizontal: BLEED,
    marginHorizontal: -BLEED,
    borderRadius: radius.md,
  },
  pressed: { opacity: 0.6 },
  // At least as wide as "00:00"; a large font widens it rather than wrapping the time.
  time: { minWidth: TIME_WIDTH },
  timeWords: { ...text.label, color: color.inkMuted },
  words: { flex: 1, minWidth: 0, gap: 2 },
  asked: { ...text.label, color: color.ink },
  outcome: { ...text.caption, color: color.inkMuted },
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
