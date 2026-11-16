/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, AnswerReply, MapScene, PlacePoint, Plan, PlanInput } from '@/api/assistant-types';
import type { PlanPart } from '@/api/plan-part-types';
import type { Place } from '@/api/types';
import { koreaClock } from '@/korea-time';

// "여기면 어때?" (P02 ticket 26): a building pressed while a meal's Plan is on screen, asked with the conditions on
// screen fixed to that Place.

// The conditions on screen with the pressed Place fixed and nothing else changed: a meal's only.
export function fixedAt(input: PlanInput, placeId: string): PlanInput | null {
  return input.kind === 'meal' ? { ...input, placeId } : null;
}

// The building's name as its card says it: "301동", or the name of a Place without a number.
function buildingWords({ number, name }: Place): string {
  return number === null ? name : `${number}동`;
}

export function pointOf(place: Place): PlacePoint {
  return { placeId: place.id, label: buildingWords(place), latitude: place.latitude, longitude: place.longitude };
}

// What the answer for the pressed Place says: its first Plan when the Place fits, else the Place among the dropped,
// with each person's part there and the server's lines.
export type HowAboutAnswer =
  | { fits: true; plan: Plan }
  | { fits: false; place: PlacePoint | null; parts: readonly PlanPart[]; lines: readonly AnswerLine[] };

export function howAboutOf(reply: AnswerReply, placeId: string): HowAboutAnswer {
  const plan = reply.plans[0];
  if (plan !== undefined) {
    return { fits: true, plan };
  }
  const dropped = reply.dropped.find(({ place }) => place.placeId === placeId) ?? reply.dropped[0];
  return { fits: false, place: dropped?.place ?? null, parts: dropped?.parts ?? [], lines: reply.noPlan?.lines ?? [] };
}

// The Place as the pill and the card name it: the Restaurant the answer planned at or dropped, else the building.
export function titleOf(place: Place, reply: AnswerReply | null): string {
  if (reply === null) {
    return buildingWords(place);
  }
  const answer = howAboutOf(reply, place.id);
  return (answer.fits ? answer.plan.place.label : answer.place?.label) ?? buildingWords(place);
}

export interface HowAboutRow {
  userId: string;
  name: string;
  words: string;
}

// When a person gets there: "지금 여기 있어요" for one already in the building, "HH:MM 도착", or "위치를 몰라요".
function arrivalWords({ walkMinutes, arriveAt = null }: PlanPart): string {
  if (walkMinutes === 0) {
    return '지금 여기 있어요';
  }
  return arriveAt === null ? '위치를 몰라요' : `${koreaClock(arriveAt)} 도착`;
}

// One row per person, "나" for the User.
export function rowsOf(parts: readonly PlanPart[]): HowAboutRow[] {
  return parts.map((part) => ({ userId: part.userId, name: part.me ? '나' : part.name, words: arrivalWords(part) }));
}

// "12:35–12:55 함께 20분 · 지금 계획보다 2분 짧아요": the new Plan's time together against the Plan on screen's.
export function noteOf(next: Plan, current: Plan): string {
  const span = `${koreaClock(next.startAt)}–${koreaClock(next.endAt)} 함께 ${String(next.togetherMinutes)}분`;
  const more = next.togetherMinutes - current.togetherMinutes;
  if (more === 0) {
    return `${span} · 지금 계획과 같아요`;
  }
  return `${span} · 지금 계획보다 ${String(Math.abs(more))}분 ${more < 0 ? '짧아요' : '길어요'}`;
}

// The map while a Place is asked about: the Plan on screen's pick kept with its number, tagged "지금 계획 · {name}", each
// person of the Plan with a line to the pressed Place, and the User's line to the Plan's pick faded. The pressed Place
// itself is marked by the building press, as on the everyday map.
export function howAboutScene(current: Plan, pressed: PlacePoint): MapScene {
  const { people } = current.scene;
  const to = { latitude: pressed.latitude, longitude: pressed.longitude };
  const lines: MapScene['routes'] = people.map(({ userId, me, at }) => ({
    userId,
    role: me ? 'me' : 'friend',
    from: at,
    to,
    minutes: 0,
  }));
  const me = people.find((person) => person.me);
  const pick = { latitude: current.place.latitude, longitude: current.place.longitude };
  const faded: MapScene['routes'] =
    me === undefined ? [] : [{ userId: me.userId, role: 'alt', from: me.at, to: pick, minutes: 0 }];
  return {
    people,
    places: [{ place: current.place, role: 'pick', tag: `지금 계획 · ${current.place.label}` }],
    routes: [...faded, ...lines],
    flags: [],
  };
}

// The answer on screen as the map draws it while a Place is asked about: the Plan on screen's scene in its place.
export function askingAnswer(answer: AnswerReply, index: number, pressed: PlacePoint): AnswerReply {
  const plans = answer.plans.map((plan, at) => (at === index ? withScene(plan, howAboutScene(plan, pressed)) : plan));
  return { ...answer, plans };
}

function withScene(plan: Plan, scene: MapScene): Plan {
  return { ...plan, scene };
}
