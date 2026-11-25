/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ConditionChip, AnswerReply, AssistantReply, Plan } from '@/api/assistant-types';
import type { BandLane, OtherLane, TimeBand } from '@/api/time-band-types';
import { previewOf } from '@/features/assistant/people-picking';
import { peopleOf } from '@/features/assistant/plan-input';
import { metresBetween } from '@/features/quests/walking-times';
import { FRIENDS, POSITIONS } from './data/friends';

// The mock's stand-in for the main server's other Friends on a meal's or a meet's band (P04 ticket 64). The stored
// answers are copies from before the band carried them, so the mock adds its own Friends who are not in the
// conditions, each busy by a fixed pattern over the band's range; and a recalculated Plan holds a lane and a chip for
// each of them who was picked, its span past their busy stretches as the phone's preview put it.

const WALK_METRES_A_MINUTE = 80;
// A Friend's busy stretches as shares of the band's range, by the Friend's place in the mock's list.
const PATTERNS: readonly (readonly (readonly [number, number])[])[] = [
  [[0.7, 0.95]],
  [[0, 0.4]],
  [[0.6, 1]],
  [
    [0, 0.15],
    [0.8, 1],
  ],
  [],
  [[0.3, 0.55]],
];

function at({ startAt, endAt }: TimeBand['range'], share: number): string {
  const from = Date.parse(startAt);
  return new Date(from + (Date.parse(endAt) - from) * share).toISOString();
}

function laneOf(userId: string, name: string, band: TimeBand): BandLane {
  const pattern = PATTERNS[FRIENDS.findIndex(({ id }) => id === userId) % PATTERNS.length] ?? [];
  const busy = pattern.map(([from, until]) => ({
    startAt: at(band.range, from),
    endAt: at(band.range, until),
    label: '수업',
  }));
  return { userId, name, busy };
}

function walkOf(userId: string, plan: Plan): number | null {
  const position = POSITIONS.find((kept) => kept.userId === userId);
  return position === undefined
    ? null
    : Math.max(1, Math.ceil(metresBetween(position, plan.place) / WALK_METRES_A_MINUTE));
}

function planWith(plan: Plan, people: ReadonlySet<string>): Plan {
  const { band } = plan;
  const kept = band.lanes.filter(({ userId }, index) => index === 0 || people.has(userId));
  const picked = FRIENDS.filter(({ id }) => people.has(id) && !kept.some(({ userId }) => userId === id));
  const lanes = [...kept, ...picked.map(({ id, name }) => laneOf(id, name, band))];
  const others: OtherLane[] = FRIENDS.filter(({ id }) => !people.has(id)).map(({ id, name }) => ({
    userId: id,
    name,
    busy: laneOf(id, name, band).busy,
    walkMinutes: walkOf(id, plan),
  }));
  const span = picked.length === 0 ? {} : previewOf(band, lanes);
  return { ...plan, band: { ...band, ...span, lanes, others } };
}

function chipsWith(chips: readonly ConditionChip[], people: ReadonlySet<string>): ConditionChip[] {
  const kept = chips.filter(({ kind, userId }) => kind !== 'person' || (userId !== null && people.has(userId)));
  const added = FRIENDS.filter(({ id }) => people.has(id) && !kept.some(({ userId }) => userId === id));
  return [...kept, ...added.map(({ id, name }): ConditionChip => ({ kind: 'person', text: name, userId: id }))];
}

export function withOtherFriends(answer: AnswerReply): AnswerReply {
  if (answer.input.kind !== 'meal' && answer.input.kind !== 'meet') {
    return answer;
  }
  const people = new Set(peopleOf(answer.input).map(({ userId }) => userId));
  return {
    ...answer,
    plans: answer.plans.map((plan) => planWith(plan, people)),
    chips: chipsWith(answer.chips, people),
  };
}

export function replyWithOtherFriends(reply: AssistantReply): AssistantReply {
  return reply.answer === undefined || reply.answer === null
    ? reply
    : { ...reply, answer: withOtherFriends(reply.answer) };
}
