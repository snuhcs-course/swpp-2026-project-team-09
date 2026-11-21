/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MeetInput } from '../assistant/dto/answer.dto.js';
import { type Prisma } from '../generated/prisma/client.js';
import { type KeptQuest, keptQuestsOf } from './kept-quests.js';
import { conflict } from './refusals.js';

// The meeting of the User's a new meet's Plan would change (P05 ticket 17, slice 2): one made from a meet's Plan, that
// day, not started yet. It is the one the model names by its ref, else the same meeting, whose people are the Friends
// asked for: the others not declined, or, when every other declined, those (rows 6 and 7). A Quest made by hand never
// counts (row 23), nor one over or under way (rows 15 and 16).

export interface HeldMeeting {
  kept: KeptQuest;
  // Its Sub Quests, which the new Plan leaves out of everyone's day.
  subQuestIds: string[];
}

export type MeetingAsked = { result: 'one'; meeting: HeldMeeting } | { result: 'several'; kept: KeptQuest[] } | null;

function peopleOf({ people }: KeptQuest): Set<string> {
  const answered = people.filter(({ answer }) => answer !== 'declined');
  return new Set((answered.length > 0 ? answered : people).map(({ userId }) => userId));
}

const sameSet = (one: Set<string>, other: readonly string[]): boolean =>
  one.size === new Set(other).size && other.every((id) => one.has(id));

// Of two or more, the one the asked time falls in, else the nearest after it (row 10a).
function aroundOf(kept: readonly KeptQuest[], around: Date | undefined): KeptQuest | undefined {
  if (around === undefined) {
    return undefined;
  }
  return (
    kept.find(({ start, end }) => start <= around && (end === null || around < end)) ??
    kept.find(({ start }) => start >= around)
  );
}

export async function heldMeetingOf(
  db: Pick<Prisma.TransactionClient, 'quest' | 'subQuest'>,
  userId: string,
  {
    date,
    now,
    friendIds,
    questId,
    around,
  }: { date: string; now: Date; friendIds: readonly string[]; questId?: string; around?: Date },
): Promise<MeetingAsked> {
  const meetings = (await keptQuestsOf(db, userId, { date, now })).filter(
    ({ kind, start }) => kind === 'meet' && start > now,
  );
  const named = questId === undefined ? undefined : questId.toLowerCase();
  const fits =
    named === undefined
      ? meetings.filter((meeting) => sameSet(peopleOf(meeting), friendIds))
      : meetings.filter((meeting) => meeting.questId.startsWith(named));
  const chosen = fits.length === 1 ? fits[0] : aroundOf(fits, around);
  if (chosen === undefined) {
    return fits.length > 1 ? { result: 'several', kept: fits } : null;
  }
  const subQuests = await db.subQuest.findMany({ where: { questId: chosen.questId }, select: { id: true } });
  return { result: 'one', meeting: { kept: chosen, subQuestIds: subQuests.map(({ id }) => id) } };
}

// A meet's Plan made into a Quest while the asker already has that meeting: it is changed in place (`PUT
// /plans/:questId`), never made a second time. One a Friend made is theirs to change.
export async function refuseHeldMeeting(
  db: Pick<Prisma.TransactionClient, 'quest' | 'subQuest'>,
  userId: string,
  { date, people }: Pick<MeetInput, 'date' | 'people'>,
  now: Date,
): Promise<void> {
  const friendIds = people.slice(1).map(({ userId: id }) => id);
  const held = await heldMeetingOf(db, userId, { date, now, friendIds });
  const [kept] = held === null ? [] : held.result === 'one' ? [held.meeting.kept] : held.kept;
  if (kept === undefined) {
    return;
  }
  if (!kept.mine) {
    throw conflict('PLAN_SET_BY_FRIEND', 'A Friend made this meeting: they change it.', { questId: kept.questId });
  }
  throw conflict('PLAN_ALREADY_SET', 'The User has this meeting already: it is changed in place.', {
    questId: kept.questId,
  });
}
