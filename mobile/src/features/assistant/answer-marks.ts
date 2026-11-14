/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { type AnswerLabel, type AnswerSymbol, color, type LabelSide } from '@/design-system';
import type { MapLine, MarkerLook } from '@/map';
import { lookName } from '@/map/marker-looks';

export interface AnswerThing {
  // Unique within a drawing.
  id: string;
  // What a screen reader says.
  name: string;
  position: LatLng;
  // An 'answer' look.
  look: MarkerLook;
  // A press shows this Plan; null takes no press.
  planId: string | null;
  // The higher is drawn on top.
  order: number;
}

export interface AnswerDrawing {
  things: AnswerThing[];
  lines: MapLine[];
  // What the camera fits.
  points: LatLng[];
  // The Plan's own points: its people, its pick, its next Class, and its flags. The camera keeps these in view when
  // not every point fits.
  own: LatLng[];
  pick: LatLng | null;
  // The people the scene draws, the User included.
  userIds: string[];
}

// The groups in the order their labels take sides, which is also the order of their symbols at one point but for the
// flags, which have none.
type Group = 'flag' | 'pick' | 'person' | 'next' | 'candidate' | 'dropped';

interface Draft {
  id: string;
  name: string;
  position: LatLng;
  planId: string | null;
  group: Group;
  symbol: AnswerSymbol | null;
  tone: AnswerLabel['tone'];
  title: string;
  line: string | null;
  // The number a pick or a candidate carries in its label when its dot is not drawn.
  number: number | null;
}

const SIDE_ORDER: Group[] = ['flag', 'pick', 'person', 'next', 'candidate', 'dropped'];
const SYMBOL_ORDER: Group[] = ['person', 'pick', 'next', 'candidate', 'dropped'];
const DRAW_ORDER: Group[] = ['pick', 'person', 'flag', 'next', 'candidate', 'dropped'];
const OWN = new Set<Group>(['person', 'pick', 'next', 'flag']);

const SIDES: Record<Group, LabelSide[]> = {
  flag: ['above', 'below', 'right', 'left'],
  pick: ['below', 'above'],
  person: ['right', 'left'],
  next: ['left', 'below', 'right', 'above'],
  candidate: ['left', 'right', 'below', 'above'],
  dropped: ['left', 'right', 'below', 'above'],
};

const ROUTE_STYLES = {
  me: { color: color.snuBlue, width: 5 },
  friend: { color: color.friend, width: 4 },
  next: { color: color.borderStrong, width: 3 },
} as const;

const METRES_PER_DEGREE = 111_320;
const ONE_POINT = 15;
// How far a label reaches from its point: sideways and how far up or down for a side label, up or down and how far
// sideways for one above or below.
const SIDE_REACH = { along: 400, across: 50 };
const UPRIGHT_REACH = { along: 120, across: 150 };

// The metres east and north from one position to another.
function offset(from: LatLng, to: LatLng): { east: number; north: number } {
  const north = (to.latitude - from.latitude) * METRES_PER_DEGREE;
  const east = (to.longitude - from.longitude) * METRES_PER_DEGREE * Math.cos((from.latitude * Math.PI) / 180);
  return { east, north };
}

function samePoint(one: LatLng, other: LatLng): boolean {
  const { east, north } = offset(one, other);
  return Math.hypot(east, north) <= ONE_POINT;
}

function personDrafts(scene: MapScene): Draft[] {
  const people = [...scene.people.filter((person) => person.me), ...scene.people.filter((person) => !person.me)];
  return people.map(({ userId, name, me, at, source, tag }) => {
    const title = tag ?? (me ? '나' : name);
    return {
      id: me ? 'answer:me' : `answer:person:${userId}`,
      name: title,
      position: at,
      planId: null,
      group: 'person',
      symbol: me ? { type: 'me' } : { type: 'face', name, dashed: source === 'timetable' },
      tone: 'person',
      title,
      line: null,
      number: null,
    };
  });
}

function placeDraft(
  { plans }: AnswerReply,
  planIndex: number,
  scene: MapScene,
  item: MapScene['places'][number],
): Draft | null {
  const { place, role, tag } = item;
  const title = tag ?? place.label;
  const position = { latitude: place.latitude, longitude: place.longitude };
  const base = { position, planId: null, title, line: null, number: null };
  if (role === 'pick') {
    const flag = scene.flags.find(({ at, role: flagRole }) => flagRole === 'place' && samePoint(at, position));
    const name = flag === undefined ? title : `${title} · ${flag.text}`;
    const number = planIndex + 1;
    const symbol: AnswerSymbol = { type: 'dot', role, number };
    return { ...base, id: 'answer:pick', name, group: role, symbol, tone: role, line: flag?.text ?? null, number };
  }
  if (role === 'candidate') {
    const index = plans.findIndex((plan) => plan.place.placeId === place.placeId && plan.place.label === place.label);
    const plan: Plan | undefined = plans[index];
    const number = plan === undefined ? null : index + 1;
    const name = number === null ? title : `후보 ${number} · ${title}`;
    const symbol: AnswerSymbol = { type: 'dot', role, number };
    return {
      ...base,
      id: `answer:candidate:${place.label}`,
      name,
      planId: plan?.id ?? null,
      group: role,
      symbol,
      tone: role,
      number,
    };
  }
  if (role === 'meeting') {
    return null;
  }
  const id = role === 'next' ? `answer:next:${place.placeId}` : `answer:dropped:${place.label}`;
  return { ...base, id, name: title, group: role, symbol: { type: 'dot', role, number: null }, tone: role };
}

function flagDrafts(scene: MapScene): Draft[] {
  const pick = scene.places.find(({ role }) => role === 'pick')?.place;
  return scene.flags.flatMap(({ at, text, role }, index): Draft[] => {
    if (
      role === 'place' &&
      pick !== undefined &&
      samePoint(at, { latitude: pick.latitude, longitude: pick.longitude })
    ) {
      return [];
    }
    const tone = role === 'meeting' ? 'meeting' : 'pick';
    return [
      {
        id: `answer:meeting:${index}`,
        name: text,
        position: at,
        planId: null,
        group: 'flag',
        symbol: null,
        tone,
        title: text,
        line: null,
        number: null,
      },
    ];
  });
}

// The things at each point: those within 15 metres of the first thing of a point stand at it.
function pointsOf(drafts: Draft[]): { position: LatLng; drafts: Draft[] }[] {
  const points: { position: LatLng; drafts: Draft[] }[] = [];
  for (const draft of drafts) {
    const point = points.find(({ position }) => samePoint(position, draft.position));
    if (point === undefined) {
      points.push({ position: draft.position, drafts: [draft] });
    } else {
      point.drafts.push(draft);
    }
  }
  return points;
}

function byGroup(order: Group[]): (one: Draft, other: Draft) => number {
  return (one, other) => order.indexOf(one.group) - order.indexOf(other.group);
}

// Whether another point lies within a label's reach on that side of its point.
function blocked(at: LatLng, side: LabelSide, others: LatLng[]): boolean {
  return others.some((other) => {
    const { east, north } = offset(at, other);
    const [along, across, reach] =
      side === 'right' || side === 'left'
        ? [side === 'right' ? east : -east, north, SIDE_REACH]
        : [side === 'above' ? north : -north, east, UPRIGHT_REACH];
    return along > 0 && along <= reach.along && Math.abs(across) <= reach.across;
  });
}

interface Placed {
  draft: Draft;
  symbol: AnswerSymbol | null;
  side: LabelSide | null;
}

// One symbol at a point, and each label at the first free side of its list.
function placeAll(drafts: Draft[]): Placed[] {
  const points = pointsOf(drafts);
  return points.flatMap(({ position, drafts: here }, index) => {
    const others = points.filter((_, other) => other !== index).map((other) => other.position);
    const drawn = here.filter(({ symbol }) => symbol !== null).toSorted(byGroup(SYMBOL_ORDER))[0];
    const taken = new Set<LabelSide>();
    return here.toSorted(byGroup(SIDE_ORDER)).map((draft) => {
      const list = SIDES[draft.group].filter((side) => !taken.has(side));
      const side = list.find((one) => !blocked(position, one, others)) ?? list[0] ?? null;
      if (side !== null) {
        taken.add(side);
      }
      return { draft, symbol: draft === drawn ? draft.symbol : null, side };
    });
  });
}

function thingOf({ draft, symbol, side }: Placed, order: number): AnswerThing {
  const { id, name, position, planId, tone, title, line, number } = draft;
  const label: AnswerLabel | null =
    side === null ? null : { side, tone, title, line, number: symbol === null ? number : null };
  return { id, name, position, look: { kind: 'answer', symbol, label }, planId, order };
}

// What the map shows for the Plan at `planIndex` of an answer: its marks, its lines, and the points the camera fits.
export function drawingOf(answer: AnswerReply, planIndex: number): AnswerDrawing {
  const plan = answer.plans[planIndex];
  if (plan === undefined) {
    return { things: [], lines: [], points: [], own: [], pick: null, userIds: [] };
  }
  const { scene } = plan;
  const drafts = [
    ...personDrafts(scene),
    ...scene.places.flatMap((place) => placeDraft(answer, planIndex, scene, place) ?? []),
    ...flagDrafts(scene),
  ];
  const placed = placeAll(drafts).toSorted(
    (one, other) =>
      byGroup(DRAW_ORDER)(one.draft, other.draft) || drafts.indexOf(one.draft) - drafts.indexOf(other.draft),
  );
  const things = placed.map((one, index) => thingOf(one, placed.length - index));
  const lines = scene.routes.map(({ role, from, to }, index) => ({
    id: `answer:route:${index}`,
    points: [from, to],
    style: ROUTE_STYLES[role],
  }));
  return {
    things,
    lines,
    points: [...things.map(({ position }) => position), ...scene.routes.flatMap(({ from, to }) => [from, to])],
    own: drafts.filter(({ group }) => OWN.has(group)).map(({ position }) => position),
    pick: drafts.find(({ group }) => group === 'pick')?.position ?? null,
    userIds: scene.people.map(({ userId }) => userId),
  };
}

// The looks of every Plan's drawing, each once.
export function looksOf(answer: AnswerReply): MarkerLook[] {
  const looks = answer.plans.flatMap((_, index) => drawingOf(answer, index).things.map(({ look }) => look));
  return looks.filter((look, index) => looks.findIndex((other) => lookName(other) === lookName(look)) === index);
}
