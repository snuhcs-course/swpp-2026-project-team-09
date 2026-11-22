/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PickPlaceOffer, type PickTimeOffer, type ReplyOffer } from '../dto/assistant-messages.dto.js';
import { type ToolContext } from '../feature.js';
import { clockOf, endOfDay, freeTimeOf } from '../free-time/free-time.js';
import { type UserDayService } from '../free-time/user-day.service.js';
import { koreaDate } from '../korea-time.js';
import { type FieldFailures } from './propose-quest-input.js';

// A Place or a time asked back as a control under the question (P05 ticket 24), for an app that says `pick`: a press
// of 지도에서 고르기 turns the map into picking, and a tap on a building sends "여기서" with the Place tapped; 시간 고르기
// opens a time wheel on the day, its free stretches marked, and a pick sends "HH:MM에". Both reach the tools as the
// User's words would.

export const PICK_PLACE: PickPlaceOffer = { kind: 'pick-place', label: '지도에서 고르기', text: '여기서' };

// What the model is told when the app shows a picker under its question.
export const PICK_NOTE =
  'The app shows a button under your question to pick it: on the map for a place (지도에서 고르기), on a time wheel for a time (시간 고르기). Ask in one short question, without listing choices.';

// The time wheel for the day, with the asker's Free Time on it, each stretch from its start to its end, "24:00" for the
// end of the day.
export async function pickTime(
  days: Pick<UserDayService, 'itemsOn'>,
  userId: string,
  date: string,
  now: Date,
): Promise<PickTimeOffer> {
  const items = await days.itemsOn(userId, date);
  const free = freeTimeOf(items, date, now).map(({ start, end }) => ({
    from: clockOf(start),
    until: end >= endOfDay(date) ? '24:00' : clockOf(end),
  }));
  return { kind: 'pick-time', label: '시간 고르기', date, free };
}

// Puts the pickers under the reply, each kind once, and answers whether the app shows them: only one that says `pick`.
export async function offerPicks(
  { capabilities, presented }: Pick<ToolContext, 'capabilities' | 'presented'>,
  picks: () => Promise<readonly ReplyOffer[]>,
): Promise<boolean> {
  if (!capabilities.has('pick')) {
    return false;
  }
  const offered = await picks();
  if (offered.length === 0) {
    return false;
  }
  const kinds = new Set(offered.map(({ kind }) => kind));
  presented.offers = [...(presented.offers ?? []).filter(({ kind }) => !kinds.has(kind)), ...offered];
  return true;
}

// The pickers of a Proposal refused for its Place or its time: the time on the day it was given for, or today when it
// was given for none or for a day gone.
export async function proposalPicks(
  failures: FieldFailures,
  startsAt: string | undefined,
  { userId, now, days }: { userId: string; now: Date; days: Pick<UserDayService, 'itemsOn'> },
): Promise<ReplyOffer[]> {
  const today = koreaDate(now);
  const at = new Date(startsAt ?? Number.NaN);
  const given = Number.isNaN(at.getTime()) ? today : koreaDate(at);
  return [
    ...(failures.placeId === undefined ? [] : [PICK_PLACE]),
    ...(failures.startsAt === undefined ? [] : [await pickTime(days, userId, given < today ? today : given, now)]),
  ];
}
