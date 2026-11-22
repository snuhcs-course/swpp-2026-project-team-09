/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Keyboard } from 'react-native';
import { turnOf } from '@/features/assistant/turn';
import { lastReply } from '@/features/assistant/use-shown-answer';
import type { ChatSheetControl } from '../chat-sheet';
import { FollowUpChips } from './follow-up-chips';
import { QuestionList, questionRowsOf } from './question-list';

// Whether the list of questions is open in the card, and what opens and closes it.
export interface QuestionsOpen {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

// The most the questions take in the card: about four rows, which scroll beyond.
export const QUESTIONS_MAX = 240;
// While typing, about two rows above the input.
const TYPING_QUESTIONS_MAX = 150;

// The conversations' questions in the card, flat (board 6 of the 2026-11-22 redesign): a press shows that turn.
export function CardQuestions({
  control,
  onDone,
  maxHeight,
}: {
  control: ChatSheetControl;
  onDone: () => void;
  maxHeight: number;
}): ReactElement {
  return (
    <QuestionList
      flat
      maxHeight={maxHeight}
      onPick={(row) => {
        onDone();
        control.showTurn(row.turnId, row.conversation);
      }}
      rows={questionRowsOf(control)}
    />
  );
}

// While the keyboard is up on the answer: the conversation's questions as one-line rows, and the follow-ups of the turn
// on screen, above the input (board 6 of the 2026-11-22 redesign), so that what is typed reads as going on.
export function Typing({ control }: { control: ChatSheetControl }): ReactElement {
  return (
    <>
      <CardQuestions
        control={control}
        maxHeight={TYPING_QUESTIONS_MAX}
        onDone={() => {
          Keyboard.dismiss();
        }}
      />
      {control.chat.waiting ? null : <FollowUps control={control} />}
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
