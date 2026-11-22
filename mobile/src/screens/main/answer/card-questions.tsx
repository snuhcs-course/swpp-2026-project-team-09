/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { now } from '@/clock';
import { color, Icon, radius, space, text } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import { type TypingWords, typingWordsOf } from '@/features/assistant/typing-words';
import { koreaDateKey } from '@/korea-time';
import { markdownLabel } from '../chat-markdown';
import { lastReply } from '@/features/assistant/use-shown-answer';
import type { ChatSheetControl } from '../chat-sheet';
import { DockChip } from './dock-chips';
import { restOf } from './docked-answer';
import { FollowUpChips } from './follow-up-chips';
import { LeaveRow } from './leave-button';
import { pressOffer } from './refusal-reply';
import { QuestionList, questionRowsOf } from './question-list';

// Whether the list of questions is open in the card, and what opens and closes it.
export interface QuestionsOpen {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

// The most the questions take in the card: about four rows, which scroll beyond.
export const QUESTIONS_MAX = 240;
// A question above the keyboard takes up to three lines, a sentence up to two.
const QUESTION_LINES = 3;
const SENTENCE_LINES = 2;

// While typing, about two rows above the input.
const TYPING_QUESTIONS_MAX = 150;

// "＋ 새 질문" under the questions the caption opened: it leaves the answer as "←" does, keeping the conversation, and
// puts the cursor in the main map's input, whose message starts a new conversation (P04 ticket 44).
function AskNewRow({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="새 질문"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.askNew, pressed && styles.pressed]}
    >
      <Icon color={color.snuBlue} name="plus" size={16} />
      <Text style={styles.askNewWords}>새 질문</Text>
    </Pressable>
  );
}

// The conversations' questions in the card, flat (board 6 of the 2026-11-22 redesign): a press shows that turn. Opened
// by the caption, it is titled "이전 질문" and ends with "＋ 새 질문" (`onAskNew`).
export function CardQuestions({
  control,
  onDone,
  maxHeight,
  onAskNew,
}: {
  control: ChatSheetControl;
  onDone: () => void;
  maxHeight: number;
  onAskNew?: () => void;
}): ReactElement {
  return (
    <QuestionList
      flat
      footer={onAskNew === undefined ? null : <AskNewRow onPress={onAskNew} />}
      maxHeight={maxHeight}
      onPick={(row) => {
        onDone();
        control.showTurn(row.turnId, row.conversation);
      }}
      rows={questionRowsOf(control)}
      title={onAskNew === undefined ? undefined : '이전 질문'}
    />
  );
}

// The questions the caption opens, and "＋ 새 질문": the answer closed as "←" closes it, then the cursor in the main
// map's input.
export function CaptionQuestions(props: {
  control: ChatSheetControl;
  list: QuestionsOpen;
  onClose: () => void;
}): ReactElement {
  const { control, list, onClose } = props;
  return (
    <CardQuestions
      control={control}
      maxHeight={QUESTIONS_MAX}
      onAskNew={() => {
        list.close();
        onClose();
        control.focusInput();
      }}
      onDone={list.close}
    />
  );
}

// The reply's words that stand above the keyboard (the rule of 2026-11-22): its question whole, up to three lines, or
// its first sentence, up to two, in the docked line's type. Nothing while the next reply is on its way.
function TypingLine({ said }: { said: TypingWords }): ReactElement | null {
  return said.words === '' ? null : (
    <Text numberOfLines={said.asks ? QUESTION_LINES : SENTENCE_LINES} style={styles.words} testID="typing-words">
      {said.words}
    </Text>
  );
}

// The ways to answer that the reply offers, which stay above the keyboard: its offers' chips, and 지도에서 고르기 and
// 시간 고르기 while the turn is the latest (P04 ticket 26). A Quest's 취소하기 or 나가기 row stays too (`LeaveRow`).
function TypingOffers({ control }: { control: ChatSheetControl }): ReactElement | null {
  const rest = restOf(control, turnOf(control.chat.bubbles)?.after ?? []);
  if (rest?.kind !== 'words') {
    return null;
  }
  const { offers } = rest.words;
  const today = koreaDateKey(now());
  const picks = control.latest
    ? (rest.words.picks ?? []).filter((offer) => offer.kind !== 'pick-time' || offer.date >= today)
    : [];
  const { send, waiting } = control.chat;
  return offers.length === 0 && picks.length === 0 ? null : (
    <View style={styles.offers} testID="typing-offers">
      {offers.map((offer) => (
        <DockChip
          disabled={waiting}
          key={offer.label}
          onPress={() => {
            pressOffer(offer, send);
          }}
          words={offer.label}
        />
      ))}
      {picks.map((offer) => (
        <DockChip
          disabled={waiting}
          key={offer.kind}
          onPress={() => {
            control.pick.start(offer);
          }}
          words={offer.label}
        />
      ))}
    </View>
  );
}

// While the keyboard is up on the answer, above the input (the rule of 2026-11-22): only what the User answers, never
// cut, in the type it has with the keyboard down. A reply that asks shows its question whole with the ways it offers to
// answer; one that asks nothing shows its first sentence, the conversation's questions as one-line rows, its offers,
// and its follow-ups (board 6 of the 2026-11-22 redesign). The caption and the card's other buttons give way.
export function Typing({ control }: { control: ChatSheetControl }): ReactElement {
  const { bubbles, waiting } = control.chat;
  const reply = turnOf(bubbles)?.after[0];
  const said = reply === undefined || waiting ? null : typingWordsOf(markdownLabel(reply.text));
  const asks = said?.asks === true;
  return (
    <>
      {said === null ? null : <TypingLine said={said} />}
      {asks ? null : (
        <CardQuestions
          control={control}
          maxHeight={TYPING_QUESTIONS_MAX}
          onDone={() => {
            Keyboard.dismiss();
          }}
        />
      )}
      <TypingOffers control={control} />
      {waiting ? null : <LeaveRow control={control} />}
      {waiting || asks ? null : <FollowUps control={control} />}
    </>
  );
}

// The follow-ups of the reply on screen while the keyboard is up, as one row of small chips over it: they are words to
// type, so they come with typing. None while the list of Friends to add or the time band moved whole takes the card.
function FollowUps({ control }: { control: ChatSheetControl }): ReactElement | null {
  const { answer, chat } = control;
  const reply = lastReply(chat.bubbles);
  const onScreen = reply !== undefined && (turnOf(chat.bubbles)?.after.includes(reply) ?? false);
  return answer.adding || answer.moving !== null || !onScreen ? null : (
    <FollowUpChips
      onAsk={(words) => {
        // As every send from the input does, so that the card shows the reply.
        Keyboard.dismiss();
        chat.send(words);
      }}
      reply={reply}
    />
  );
}

const styles = StyleSheet.create({
  // The docked line's type (`DockLine`), so that the words keep their look when the keyboard comes up.
  words: { ...text.body, color: color.ink },
  offers: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  // As high as a question's row, its mark in the time's column.
  askNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 48,
    paddingHorizontal: space[2] + space[4],
    borderRadius: radius.md,
  },
  pressed: { opacity: 0.6 },
  askNewWords: { ...text.label, color: color.snuBlue },
});
