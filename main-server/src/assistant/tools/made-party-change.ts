/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type SubQuest } from '../../generated/prisma/client.js';
import { type SubQuestContentDto } from '../../quests/dto/quest-requests.dto.js';
import { type ToolContext } from '../feature.js';
import { koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { type ProposalChange, type ProposalPlace, type QuestProposal, type SentProposal } from '../proposal.js';
import { type UserDayService } from '../free-time/user-day.service.js';
import { type MadeParty, type MadePartyService } from './made-party.js';
import { type FieldFailures, type Input } from './propose-quest-input.js';
import { proposedAnswer, refusedAnswer } from './proposed-answer.js';

// A made 파티 changed in place from the Assistant (P05 ticket 30, rows 30 to 38 of ticket 17's case table), for an app
// that draws the change: its time and place only, shown as a card whose 바꾸기 sends the step to the room's 일정 수정,
// which keeps everyone who is in and tells each other Holder. The rest of it is changed in its room.

const GONE =
  'The 파티 of [Proposal made: …] is no longer there: it was cancelled, or the User left it. Say so, and ask whether to propose it again; to propose it, call proposeQuest with another: true.';
const LED_BY_OTHER =
  'The User no longer leads this 파티, so it is not changed here. Say that its leader changes it (리더에게 말해 주세요), naming the leader.';
const STARTED = 'The 파티 has started or is over, so it is not changed. Say 이미 시작한 파티예요.';
const IN_ROOM =
  'Only the time and the place of a made 파티 are changed here. Say that the rest, such as its title, capacity, Join Policy, Board, description, event or invited Friends, is changed with 수정 in its room, which the button under your reply opens. Never propose a new card for it.';
const UNCHANGED = 'Its time and place are already those given, so nothing changes. Ask the User what to change.';

// The button under the reply that opens the 파티's room at its 수정.
const ROOM_LABEL = '파티 수정하기';

// The made 파티 whose step is changed: the one step a Holder added, which has not started.
export type ChangedParty = Extract<MadeParty, { kind: 'found' }> & { step: SubQuest };

const sameIds = (given: readonly string[], shown: readonly string[]): boolean =>
  given.length === shown.length && given.every((id) => shown.includes(id));

const differs = (value: unknown, before: unknown): boolean => value !== undefined && value !== before;

// A field given that differs from the made Proposal's, which only its room changes. One left out is the same.
function otherFieldChanged(given: Input, shown: SentProposal): boolean {
  return (
    differs(given.title?.trim(), shown.title) ||
    differs(given.description?.trim(), shown.description) ||
    differs(given.joinPolicy, shown.joinPolicy) ||
    differs(given.board, shown.board) ||
    differs(given.capacity, shown.capacity) ||
    differs(given.globalEventId, shown.globalEvent?.id) ||
    (given.inviteeIds !== undefined &&
      !sameIds(
        given.inviteeIds,
        shown.invitees.map(({ id }) => id),
      ))
  );
}

function inRoom(questId: string, context: ToolContext): { answer: object } {
  const offers = (context.presented.offers ?? []).filter((offer) => offer.kind !== 'quest');
  context.presented.offers = [...offers, { kind: 'quest', label: ROOM_LABEL, questId }];
  return { answer: { result: 'in-room', questId, reason: IN_ROOM } };
}

// The made 파티 to change, or what proposeQuest answers when it is not changed here: gone (row 36), led by another
// (row 37), started or over (row 35), or asked to change more than its time and place (row 34).
function madeTarget(
  party: MadeParty,
  given: Input,
  shown: SentProposal,
  context: ToolContext,
  questId: string,
): ChangedParty | { answer: object } {
  if (party.kind === 'gone') {
    return { answer: { result: 'gone', questId, reason: GONE } };
  }
  if (party.kind === 'led-by-other') {
    const leader = othersText('leader.name', party.leaderName);
    return { answer: { result: 'led-by-other', questId, leader, reason: LED_BY_OTHER } };
  }
  const { step } = party;
  if (step !== null && step.startsAt !== null && step.startsAt <= context.now) {
    return { answer: { result: 'started', questId, reason: STARTED } };
  }
  if (step === null || step.startsAt === null || otherFieldChanged(given, shown)) {
    return inRoom(questId, context);
  }
  return { ...party, step };
}

// The input of the change: the made Proposal's values, with the time and the Place given. A time or a Place left out,
// or given as the made Proposal's, keeps the step's own, which may have changed since in the room or in the card's 수정
// form: only one the User asked for moves it. The step's Place is no input: `keepsPlace` says to keep it.
function changedInput(given: Input, shown: SentProposal, step: SubQuest): { input: Input; keepsPlace: boolean } {
  const keepsTime =
    given.startsAt === undefined || new Date(given.startsAt).getTime() === new Date(shown.startsAt).getTime();
  const keepsPlace = given.placeId === undefined || given.placeId === shown.place?.id;
  return {
    keepsPlace,
    input: {
      title: shown.title,
      description: shown.description,
      joinPolicy: shown.joinPolicy,
      board: shown.board ?? undefined,
      capacity: shown.capacity,
      startsAt: keepsTime ? (step.startsAt === null ? undefined : koreaTime(step.startsAt)) : given.startsAt,
      ...(keepsPlace ? {} : { placeId: given.placeId }),
      globalEventId: shown.globalEvent?.id,
      inviteeIds: shown.invitees.map(({ id }) => id),
    },
  };
}

// The step's place as the room's 일정 수정 takes it back.
function placeOf({ placeId, latitude, longitude, placeLabel }: SubQuest): SubQuestContentDto['place'] {
  if (placeId !== null) {
    return { placeId };
  }
  if (latitude !== null && longitude !== null && placeLabel !== null) {
    return { latitude, longitude, label: placeLabel };
  }
  return placeLabel === null ? null : { label: placeLabel };
}

// The step as the change leaves it: the Proposal's time, with its end moved as far, and its Place when one was asked
// for and differs. Null when neither moved.
function changeOf(
  party: ChangedParty,
  { proposal, keepsPlace }: { proposal: QuestProposal; keepsPlace: boolean },
  questId: string,
): ProposalChange | null {
  const { step } = party;
  const start = new Date(proposal.startsAt);
  const was = step.startsAt?.getTime() ?? start.getTime();
  const placeMoved = !keepsPlace && proposal.place !== null && proposal.place.id !== step.placeId;
  if (!placeMoved && was === start.getTime()) {
    return null;
  }
  const endsAt = step.endsAt === null ? null : koreaTime(new Date(step.endsAt.getTime() + start.getTime() - was));
  return {
    questId,
    subQuestId: step.id,
    step: {
      title: step.title ?? party.title,
      startsAt: proposal.startsAt,
      endsAt,
      place: placeMoved && proposal.place !== null ? { placeId: proposal.place.id } : placeOf(step),
    },
    told: party.others,
  };
}

// What changeMade checks the changed Proposal with, and reads the asker's day and their made 파티 from.
export interface ChangeMadeServices {
  days: Pick<UserDayService, 'itemsOn'>;
  madeParties: Pick<MadePartyService, 'of'>;
  // proposeQuest's own checks of a Proposal.
  proposalOf: (given: Input) => Promise<{ proposal: QuestProposal } | { failures: FieldFailures }>;
  // A Place of the list as a card shows it, or null when it is no longer there.
  placeOf: (placeId: string) => Promise<ProposalPlace | null>;
}

// A change of the made 파티's time or place, shown as a card with 바꾸기, or why it is not changed here.
export async function changeMade(
  questId: string,
  given: Input,
  { context, shown }: { context: ToolContext; shown: SentProposal },
  services: ChangeMadeServices,
): Promise<object> {
  const target = madeTarget(await services.madeParties.of(context.userId, questId), given, shown, context, questId);
  if ('answer' in target) {
    return target.answer;
  }
  const { input: changed, keepsPlace } = changedInput(given, shown, target.step);
  const checked = await services.proposalOf(changed);
  if ('failures' in checked) {
    return refusedAnswer(checked.failures, context.presented);
  }
  const change = changeOf(target, { proposal: checked.proposal, keepsPlace }, questId);
  if (change === null) {
    return { result: 'unchanged', questId, reason: UNCHANGED };
  }
  const { placeId } = target.step;
  const kept = keepsPlace && placeId !== null ? await services.placeOf(placeId) : null;
  const card = keepsPlace ? { ...checked.proposal, place: kept } : checked.proposal;
  context.presented.proposal = { ...card, change };
  return proposedAnswer(card, context.userId, {
    days: services.days,
    presented: context.presented,
    change: target,
  });
}
