/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { Lookup } from '@/api/lookup-types';
import type { Refusal } from '@/api/refusal-types';
import { Button } from '@/design-system';
import { peopleOf } from '@/features/assistant/plan-input';
import type { ChatSheetControl } from '../chat-sheet';
import { lookupMainOf, useLookupMain } from './lookup-card';
import { lookupReplyOf, onScreenOf, planShown } from './reply-words';
import { lookupDocks } from './words-rest';

// The main button of the Plan on screen, beside the input: it says what it does.
export interface PlanAction {
  words: string;
  onPress: () => void;
  disabled: boolean;
}

// "만들고 초대 보내기" for a Plan with a Friend, as "이대로 초대" made it into a Quest and invited them; "일정에 넣기" for
// a meal's Plan alone, as "여기로" took it. None once the Plan is sent, while "여기면 어때?" is asked, or for a Plan
// whose card holds its own buttons (events, parties, a new recruiting Quest).
export function planActionOf(control: ChatSheetControl): PlanAction | null {
  const { answer: shown, invitation, howAbout, framed } = control;
  const { answer, plan } = shown;
  if (!framed || answer === null || plan === null || invitation.made !== null || howAbout.place !== null) {
    return null;
  }
  if (!planShown(control.chat.bubbles, onScreenOf(control))) {
    return null;
  }
  const { kind } = answer.input;
  const people = peopleOf(answer.input).length;
  // While a follow-up's reply is on its way the Plan on screen is about to be replaced.
  const disabled = shown.recalculating || invitation.sending || control.chat.waiting;
  if (kind !== 'new-quest' && people > 1) {
    return {
      words: invitation.sending ? '보내는 중이에요' : '만들고 초대 보내기',
      onPress: invitation.invite,
      disabled,
    };
  }
  return kind === 'meal' && people === 1 ? { words: '일정에 넣기', onPress: invitation.invite, disabled } : null;
}

export function PlanActionButton({ action }: { action: PlanAction }): ReactElement {
  return (
    <Button disabled={action.disabled} onPress={action.onPress}>
      {action.words}
    </Button>
  );
}

// The answer's main button beside the input: the Plan's, else that of the Lookup on screen when it docks ("길 안내",
// "가는 길", "만나고 싶다", or the first offer of a refusal beside it).
export type AnswerAction =
  { kind: 'plan'; plan: PlanAction } | { kind: 'lookup'; lookup: Lookup; refusal: Refusal | null };

export function answerActionOf(control: ChatSheetControl): AnswerAction | null {
  const plan = planActionOf(control);
  if (plan !== null) {
    return { kind: 'plan', plan };
  }
  const { lookup } = control.lookup;
  const reply = control.framed ? lookupReplyOf(control.chat.bubbles, onScreenOf(control)) : undefined;
  if (lookup === null || reply === undefined) {
    return null;
  }
  const refusal = reply.refusal ?? null;
  return lookupDocks(lookup, refusal) && lookupMainOf(lookup, refusal) !== null
    ? { kind: 'lookup', lookup, refusal }
    : null;
}

interface LookupActionProps {
  control: ChatSheetControl;
  lookup: Lookup;
  refusal: Refusal | null;
}

function LookupActionButton({ control, lookup, refusal }: LookupActionProps): ReactElement | null {
  const { chat } = control;
  const main = useLookupMain({
    lookup,
    refusal,
    shown: control.lookup,
    onAsk: chat.send,
    addRecalculated: chat.addRecalculated,
  });
  return main === null ? null : <Button onPress={main.onPress}>{main.label}</Button>;
}

export function AnswerActionButton({
  action,
  control,
}: {
  action: AnswerAction;
  control: ChatSheetControl;
}): ReactElement {
  return action.kind === 'plan' ? (
    <PlanActionButton action={action.plan} />
  ) : (
    <LookupActionButton control={control} lookup={action.lookup} refusal={action.refusal} />
  );
}
