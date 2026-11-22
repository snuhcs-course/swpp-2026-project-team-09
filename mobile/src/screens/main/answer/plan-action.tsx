/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import type { QuestOffer } from '@/api/party-change-types';
import type { Lookup } from '@/api/lookup-types';
import type { Refusal } from '@/api/refusal-types';
import { Button } from '@/design-system';
import { peopleOf } from '@/features/assistant/plan-input';
import { type SetQuest, setQuestOf } from '@/features/assistant/set-quest';
import type { ChatSheetControl } from '../chat-sheet';
import { CHANGE_WORDS, type ProposalMaking } from '../chat-proposal-card';
import { lookupMainOf, useLookupMain } from './lookup-card';
import { RoomOfferButton, roomOfferOn } from './room-offer';
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
  const disabled = shown.recalculating || invitation.sending || invitation.changing || control.chat.waiting;
  const set = setQuestOf(answer);
  if (set !== null) {
    // Once 바꾸기 changed the meeting, or 그대로 두기 left the Quest, the answer says so and offers nothing more.
    const chosen = invitation.changed !== null || invitation.left !== null;
    return chosen ? null : setQuestAction(set, control, disabled || invitation.changing);
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
  // A 바꾸기 refused for good sends the User to the 파티 too.
  if (!set.changeable || invitation.refused !== null) {
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
    <Button disabled={action.disabled} onPress={action.onPress} full size="bar">
      {action.words}
    </Button>
  );
}

// The answer's main button beside the input: the Plan's, else that of the Lookup on screen when it docks ("길 안내",
// "가는 길", "만나고 싶다", or the first offer of a refusal beside it), else a reply's 파티 수정하기 (P04 ticket 25).
export type AnswerAction =
  | { kind: 'plan'; plan: PlanAction }
  | { kind: 'lookup'; lookup: Lookup; refusal: Refusal | null }
  | { kind: 'room'; offer: QuestOffer };

const PROPOSAL_MAKING_WORDS: Record<ProposalMaking, string> = {
  ready: '만들기',
  making: '만드는 중',
  made: '만들었어요',
  stale: '만들기',
};

// The button of the Proposal on the map (P04 ticket 06): "만들고 초대 보내기" when it invites someone, else "만들기", which
// makes the Quest as the Proposal card's 만들기 does; for a change of a made 파티 (ticket 25), the card's 바꾸기. None while
// no Proposal is drawn.
export function proposalActionOf(control: ChatSheetControl): PlanAction | null {
  const { proposal: shown, framed, leaving, chat } = control;
  if (!framed || shown === null) {
    return null;
  }
  const { bubbleId, proposal } = shown;
  const making = leaving.proposals.makingOf(bubbleId);
  if (proposal.change !== undefined) {
    return {
      words: CHANGE_WORDS[making],
      onPress: () => {
        leaving.proposals.make(bubbleId, proposal);
      },
      disabled: making !== 'ready' || chat.waiting,
    };
  }
  const ready = proposal.invitees.length > 0 ? '만들고 초대 보내기' : '만들기';
  return {
    words: making === 'ready' ? ready : PROPOSAL_MAKING_WORDS[making],
    onPress: () => {
      leaving.proposals.make(bubbleId, proposal);
    },
    disabled: making !== 'ready' || chat.waiting,
  };
}

// The button of the seat card's booking on the map (P04 ticket 07): the card's main action, "예약하기", or "로그인"
// while logged out of the library. None until the card told it.
export function bookingActionOf({ booking, bookingStage, framed, chat }: ChatSheetControl): PlanAction | null {
  const { seen, press } = bookingStage;
  if (!framed || booking === null || seen === null || seen.place !== booking.place || seen.words === null) {
    return null;
  }
  return { words: seen.words, onPress: press, disabled: seen.disabled || chat.waiting };
}

// After a booking, "확인" closes the answer and keeps the conversation (P01 ticket 03): the done message says what was
// booked, and its own 좌석 현황 보기 is the second way on.
export function bookedActionOf({ framed, chat, hide }: ChatSheetControl): PlanAction | null {
  const last = chat.bubbles.at(-1);
  if (!framed || last?.done === undefined || chat.waiting) {
    return null;
  }
  return { words: '확인', onPress: hide, disabled: false };
}

// Of several requests (P04 ticket 09), the button is the shown step's action: its booking's, or its Plan's.
function stepActionOf(control: ChatSheetControl): PlanAction | null {
  const step = control.steps?.steps[control.activeStep];
  if (step === undefined || step.status !== 'shown') {
    return null;
  }
  return step.kind === 'seat' || step.kind === 'room' ? bookingActionOf(control) : planActionOf(control);
}

export function answerActionOf(control: ChatSheetControl): AnswerAction | null {
  const plan =
    control.steps === null
      ? (planActionOf(control) ?? proposalActionOf(control) ?? bookingActionOf(control) ?? bookedActionOf(control))
      : stepActionOf(control);
  if (plan !== null) {
    return { kind: 'plan', plan };
  }
  const room = control.framed ? roomOfferOn(control.chat.bubbles) : null;
  if (room !== null) {
    return { kind: 'room', offer: room };
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
    <Button disabled={chat.waiting} onPress={main.onPress} full size="bar">
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
  if (action.kind === 'plan') {
    return <PlanActionButton action={action.plan} />;
  }
  if (action.kind === 'room') {
    return <RoomOfferButton disabled={control.chat.waiting} offer={action.offer} />;
  }
  return <LookupActionButton control={control} lookup={action.lookup} refusal={action.refusal} />;
}
