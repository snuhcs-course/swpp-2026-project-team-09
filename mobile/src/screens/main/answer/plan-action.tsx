/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import type { Lookup } from '@/api/lookup-types';
import type { Refusal } from '@/api/refusal-types';
import { Button } from '@/design-system';
import { peopleOf } from '@/features/assistant/plan-input';
import { type SetQuest, setQuestOf } from '@/features/assistant/set-quest';
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

// "만들고 초대 보내기" for a Plan with a Friend, as "이대로 초대" made it into a Quest and invited them; "일정에 넣기" for a meal's Plan
// alone, as "여기로" took it; beside a Quest the User holds, "바꾸기" or "파티 보기". None once the Plan is sent, while "여기면 어때?"
// is asked, or for a Plan whose card holds its own buttons (events, parties, a new recruiting Quest).
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
  const set = setQuestOf(answer);
  if (set !== null) {
    // Once 바꾸기 changed the meeting, the answer says so and offers nothing more.
    return invitation.changed === null ? setQuestAction(set, control, disabled || invitation.changing) : null;
  }
  if (kind !== 'new-quest' && people > 1) {
    return {
      words: invitation.sending ? '보내는 중이에요' : '만들고 초대 보내기',
      onPress: invitation.invite,
      disabled,
    };
  }
  return kind === 'meal' && people === 1 ? { words: '일정에 넣기', onPress: invitation.invite, disabled } : null;
}

// Beside a Quest the User holds (P04 ticket 17): "바꾸기" makes the Plan in its place, or for a meeting changes that
// Quest in place; one the User may not change is changed in its 파티, which "파티 보기" opens.
function setQuestAction(set: SetQuest, { invitation }: ChatSheetControl, disabled: boolean): PlanAction {
  if (!set.changeable) {
    return {
      words: '파티 보기',
      onPress: () => {
        router.push(`/room/${set.questId}`);
      },
      disabled: false,
    };
  }
  if (set.inPlace) {
    const onPress = (): void => {
      invitation.change(set.questId);
    };
    return { words: invitation.changing ? '바꾸는 중이에요' : '바꾸기', onPress, disabled };
  }
  return { words: invitation.sending ? '바꾸는 중이에요' : '바꾸기', onPress: invitation.invite, disabled };
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
  // Disabled while the next reply is on its way: it would act on the turn before.
  return main === null ? null : (
    <Button disabled={chat.waiting} onPress={main.onPress}>
      {main.label}
    </Button>
  );
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
