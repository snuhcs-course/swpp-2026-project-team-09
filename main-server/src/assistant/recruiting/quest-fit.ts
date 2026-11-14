/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type TravelProvider } from '../../travel/travel.js';
import { attempt, type EventPlan, type EventPlanning, type PlacedEvent } from '../events/event-fit.js';
import { type DayItem, type FreeInterval, freeTimeOf } from '../free-time/free-time.js';
import { koreaDate } from '../korea-time.js';

// Which recruiting Quests the asker could join, each judged on its first Sub Quest ahead that has a start and a Place
// of the list: whether they can be there by its start, as an event that has not started is judged, and how long they
// can stay.

export interface QuestStep {
  start: Date | null;
  end: Date | null;
  // Null when the step's place is no Place of the list.
  placeId: string | null;
  // The step's own words for its place.
  place: string | null;
  cancelled: boolean;
}

export interface DayQuest {
  id: string;
  title: string;
  steps: QuestStep[];
  // A Quest for a Global Event: the event's end, until which a step with no end lasts.
  eventEnd: Date | null;
  // The asker's Friends among its Holders, in the order they entered.
  friendNames: string[];
}

// The plan of a Quest is that of an event at its step: one that has not started when the asker gets there.
export type QuestPlan = EventPlan & { quest: DayQuest };

export type QuestDropReason =
  { kind: 'started' } | { kind: 'late'; arriveAt: Date } | { kind: 'short'; minutes: number };

export interface QuestDrop {
  quest: DayQuest;
  // Its judged step, as an event.
  event: PlacedEvent;
  reason: QuestDropReason;
}

export interface QuestDay {
  quests: readonly DayQuest[];
  // The asker's items of a day.
  itemsOn: (date: string) => readonly DayItem[];
  // A whole minute.
  now: Date;
  locationPlaceId: string | null;
}

export interface QuestPlanning {
  // Where the asker sets out from for the first plan, and the item after it, for the chips.
  first: EventPlanning['first'];
  plans: QuestPlan[];
  dropped: QuestDrop[];
}

type TimedStep = QuestStep & { start: Date; placeId: string };

const isTimed = (step: QuestStep): step is TimedStep => step.start !== null && step.placeId !== null;

// The first step ahead with a start and a Place of the list, in the order of their starts.
export function judgedStep({ steps }: DayQuest, now: Date): TimedStep | undefined {
  return steps
    .filter((step) => !step.cancelled && (step.end === null || step.end > now))
    .filter((step) => isTimed(step))
    .toSorted((a, b) => a.start.getTime() - b.start.getTime())[0];
}

// The Place where these Quests all meet, by the step each is judged on; null when they meet at more than one, or none
// has such a step.
export function meetingPlaceOf(quests: readonly DayQuest[], now: Date): string | null {
  const placeIds = new Set(quests.flatMap((quest) => judgedStep(quest, now)?.placeId ?? []));
  const [placeId = null] = placeIds;
  return placeIds.size === 1 ? placeId : null;
}

// The step as an event: a step with no end lasts until its Global Event ends, and otherwise as an event with no end.
const eventOf = (quest: DayQuest, { start, end, placeId, place }: TimedStep): PlacedEvent => ({
  id: quest.id,
  title: quest.title,
  start,
  end: end ?? quest.eventEnd,
  placeId,
  place,
});

// The stretch of Free Time the step starts in, or else the first after it: the asker comes once the item ends.
const stretchFor = (stretches: readonly FreeInterval[], start: Date): FreeInterval | undefined =>
  stretches.find((stretch) => stretch.start <= start && start < stretch.end) ??
  stretches.find((stretch) => stretch.start > start);

function fitOne(quest: DayQuest, day: QuestDay, travel: TravelProvider): QuestPlan | QuestDrop | null {
  const step = judgedStep(quest, day.now);
  if (step === undefined) {
    return null;
  }
  const event = eventOf(quest, step);
  if (step.start < day.now) {
    return { quest, event, reason: { kind: 'started' } };
  }
  const date = koreaDate(step.start);
  const items = day.itemsOn(date);
  const stretch = stretchFor(freeTimeOf(items, date, day.now), step.start);
  if (stretch === undefined) {
    return null;
  }
  const {
    arriveAt,
    fits: _fits,
    ...tried
  } = attempt(event, stretch, { items, date, now: day.now, locationPlaceId: day.locationPlaceId, events: [] }, travel);
  if (tried.state === 'under-way') {
    return { quest, event, reason: { kind: 'late', arriveAt } };
  }
  if (tried.stayMinutes < 1) {
    return { quest, event, reason: { kind: 'short', minutes: Math.max(0, tried.stayMinutes) } };
  }
  return { ...tried, clash: null, quest };
}

const byTitle = (a: QuestPlan, b: QuestPlan): number =>
  a.quest.title < b.quest.title ? -1 : Number(a.quest.title > b.quest.title);

// A Quest a Friend holds first, then the earlier start, then the title.
const byOrder = (a: QuestPlan, b: QuestPlan): number =>
  Number(b.quest.friendNames.length > 0) - Number(a.quest.friendNames.length > 0) ||
  a.start.getTime() - b.start.getTime() ||
  byTitle(a, b);

export function fitQuests(day: QuestDay, travel: TravelProvider): QuestPlanning {
  const fitted = day.quests.flatMap((quest) => fitOne(quest, day, travel) ?? []);
  const plans = fitted.filter((each): each is QuestPlan => 'state' in each).toSorted(byOrder);
  const [plan] = plans;
  return {
    first: plan === undefined ? null : { origin: plan.origin, next: plan.next?.item ?? null },
    plans,
    dropped: fitted.filter((each): each is QuestDrop => !('state' in each)),
  };
}
