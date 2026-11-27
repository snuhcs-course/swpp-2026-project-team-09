/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import type { QuestOffer } from '@/api/party-change-types';
import type { Lookup } from '@/api/lookup-types';
import type { Refusal } from '@/api/refusal-types';
import { Button } from '@/design-system';
import { addingWordsOf } from '@/features/assistant/adding-words';
import { peopleOf, schedulesAlone } from '@/features/assistant/plan-input';
import { type SetQuest, setQuestOf } from '@/features/assistant/set-quest';
import type { ChatSheetControl } from '../chat-sheet';
import { CHANGE_WORDS, type ProposalMaking } from '../chat-proposal-card';
import { type Choice, ChoiceRow } from './choice-row';
import { lookupMainOf, useLookupMain } from './lookup-card';
import { RoomOfferButton, roomOfferOn } from './room-offer';
import { lookupReplyOf, onScreenOf, planShown } from './reply-words';
import { lookupDocks } from './words-rest';
import type { StepBack } from '../library/act-stage';
import { ConfirmRow } from './confirm-row';

// The main button of the Plan on screen, beside the input: it says what it does.
export interface PlanAction {
  words: string;
  onPress: () => void;
  disabled: boolean;
  // A secondary choice on the same row, at the left (P04 ticket 50): 그대로 두기 beside a Quest the User holds.
  secondary?: Choice;
  // Drawn in red: a booking's 예약 취소 (P01 ticket 15).
  danger?: boolean;
  // An armed step: the round ✕ at the left that un-arms it without acting (P01 ticket 21).
  back?: StepBack;
}

// "만들고 초대 보내기" for a Plan with a Friend, as "이대로 초대" made it into a Quest and invited them; "일정에 넣기" for a meal's Plan
// alone, as "여기로" took it; beside a Quest the User holds, "바꾸기" or "파티 보기". None once the Plan is sent, or for a
// Plan whose card holds its own buttons (events, parties, a new recruiting Quest).
export function planActionOf(control: ChatSheetControl): PlanAction | null {
  const { answer: shown, invitation, framed } = control;
  const { answer, plan } = shown;
  if (!framed || answer === null || plan === null || invitation.made !== null) {
    return null;
  }
  // A study answer's group study room tells its own main button, as a booking ticket does (P10 ticket 11).
  if (!planShown(control.chat.bubbles, onScreenOf(control)) || plan.study?.group !== undefined) {
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
    if (chosen) {
      return null;
    }
    const main = setQuestAction(set, control, disabled || invitation.changing);
    // After a 바꾸기 refused for good there is nothing left to keep or change: "파티 보기" alone (PR 514's review).
    if (invitation.refused !== null) {
      return main;
    }
    // 그대로 두기 waits while 바꾸기 or a recalculation is on its way: the answer it would leave is about to change.
    const keep = {
      words: '그대로 두기',
      onPress: invitation.leave,
      disabled: invitation.sending || invitation.changing || shown.recalculating,
    };
    return { ...main, secondary: keep };
  }
  if (kind !== 'new-quest' && people > 1) {
    return {
      words: invitation.sending ? '보내는 중이에요' : '만들고 초대 보내기',
      onPress: invitation.invite,
      disabled,
    };
  }
  return schedulesAlone(answer.input, plan) ? { words: '일정에 넣기', onPress: invitation.invite, disabled } : null;
}

// Beside a Quest the User holds (P04 ticket 17): "바꾸기" makes the Plan in its place, or for a meeting changes that
// Quest in place, saying whom it invites when it adds Friends to it (P05 ticket 44); one the User may not change is changed in its 파티, which "파티 보기" opens.
function setQuestAction(set: SetQuest, { invitation, answer }: ChatSheetControl, disabled: boolean): PlanAction {
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
    // Friends added to the meal the User holds: the press says whom it invites (P05 ticket 44).
    const { adding } = answer.answer ?? {};
    const words =
      adding === undefined || adding === null || adding.friends.length === 0 ? '바꾸기' : addingWordsOf(adding);
    return { words: invitation.changing ? '바꾸는 중이에요' : words, onPress, disabled };
  }
  return { words: invitation.sending ? '바꾸는 중이에요' : '바꾸기', onPress: invitation.invite, disabled };
}

export function PlanActionButton({ action }: { action: PlanAction }): ReactElement {
  if (action.back !== undefined) {
    return <ConfirmRow action={action} back={action.back} />;
  }
  if (action.secondary !== undefined) {
    return <ChoiceRow main={action} secondary={action.secondary} />;
  }
  return (
    <Button
      disabled={action.disabled}
      onPress={action.onPress}
      full
      size="bar"
      variant={action.danger === true ? 'danger' : 'primary'}
    >
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

// A booking's ticket's main button (P01 ticket 15): after a booking, 가는 길, or 예약 취소 once its "예약 취소 ›" was
// pressed; a return card's 반납하기; a cancel card's 예약 취소. Only that of the bubble on screen, the last.
export function libraryActOf({ framed, chat, libraryAct }: ChatSheetControl): PlanAction | null {
  const { seen, press } = libraryAct;
  if (!framed || seen === null || chat.bubbles.at(-1)?.id !== seen.bubbleId) {
    return null;
  }
  const back = seen.back === null ? {} : { back: { label: seen.back, onPress: libraryAct.stepBack } };
  return { words: seen.words, onPress: press, disabled: seen.disabled || chat.waiting, danger: seen.danger, ...back };
}

// Of several requests (P04 ticket 09), the button is the shown step's action: its booking's, or its Plan's, which a
// group study room tells itself, as alone (P10 ticket 16).
function stepActionOf(control: ChatSheetControl): PlanAction | null {
  const step = control.steps?.steps[control.activeStep];
  if (step === undefined || step.status !== 'shown') {
    return null;
  }
  if (step.kind === 'seat' || step.kind === 'room') {
    return bookingActionOf(control);
  }
  return control.answer.plan?.study?.group === undefined ? planActionOf(control) : libraryActOf(control);
}

export function answerActionOf(control: ChatSheetControl): AnswerAction | null {
  // While the earlier questions cover the answer, its main button gives way: the list is for moving between questions
  // (P04 ticket 50).
  if (control.card.earlier.open) {
    return null;
  }
  const plan =
    control.steps === null
      ? (planActionOf(control) ?? proposalActionOf(control) ?? bookingActionOf(control) ?? libraryActOf(control))
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
  // An answer that only tells a fact (an hours or a menu answer) has no main action in the dock; its Place's card keeps
  // the way (P04 ticket 55). A refusal's offer beside it is still the reply's own.
  const fact = lookup.fact === true && refusal === null;
  return !fact && lookupDocks(lookup, refusal) && lookupMainOf(lookup, refusal) !== null
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
