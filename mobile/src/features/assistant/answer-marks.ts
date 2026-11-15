/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { type AnswerLabel, type AnswerSymbol, type FaceBadge, type LabelSide } from '@/design-system';
import type { MarkerLook } from '@/map';
import { lookName } from '@/map/marker-looks';
import { type AnswerDrawing, type AnswerThing, metresBetween, offset } from './answer-drawing';
import {
  destinationOf,
  DRAW_ORDER,
  FLAG_TONES,
  type Group,
  OWN,
  ROUTE_STYLES,
  SIDE_ORDER,
  SIDES,
  SYMBOL_ORDER,
} from './answer-groups';
import { NO_STANDINGS, type Standing, standingWords } from './invited-friends';

export type { AnswerDrawing, AnswerThing } from './answer-drawing';

interface Draft {
  id: string;
  name: string;
  position: LatLng;
  planId: string | null;
  group: Group;
  symbol: AnswerSymbol | null;
  tone: AnswerLabel['tone'];
  // Null for a mark that takes no label.
  title: string | null;
  line: string | null;
  // The number a pick or a candidate carries in its label when its dot is not drawn.
  number: number | null;
}

const ONE_POINT = 15;
// How far a label reaches from its point: sideways and how far up or down for a side label, up or down and how far
// sideways for one above or below.
const SIDE_REACH = { along: 400, across: 50 };
const UPRIGHT_REACH = { along: 120, across: 150 };
// How many characters of a name a face shows (`MapAnswerMark`).
const FACE_LETTERS = 2;

function samePoint(one: LatLng, other: LatLng): boolean {
  return metresBetween(one, other) <= ONE_POINT;
}

// Whether a position is so near one of the Plan's own marks that a picture drawn there would lie over the mark or
// its words: within the reach of a label above or below it.
export function nearOwnMark({ own }: Pick<AnswerDrawing, 'own'>, position: LatLng): boolean {
  return own.some((mark) => {
    const { east, north } = offset(mark, position);
    return Math.abs(north) <= UPRIGHT_REACH.along && Math.abs(east) <= UPRIGHT_REACH.across;
  });
}

const BADGES: Partial<Record<Standing['state'], FaceBadge>> = {
  invited: 'waiting',
  accepted: 'accepted',
  late: 'accepted',
};

function faceOf(name: string, dashed: boolean, standing: Standing | undefined): AnswerSymbol {
  const badge = standing === undefined ? undefined : BADGES[standing.state];
  return badge === undefined ? { type: 'face', name, dashed } : { type: 'face', name, dashed, badge };
}

// The words of a face's tag that the face does not show already: a face shows the first two characters of the name,
// so the tag of a name that short leaves the name out, and is none when the name is all it says.
function faceTitle(name: string, tag: string): string | null {
  if (Array.from(name).length > FACE_LETTERS) {
    return tag;
  }
  return tag === name ? null : restOf(name, tag);
}

// Words without the name they start with, which the mark says already.
function restOf(name: string, words: string): string {
  const lead = `${name} · `;
  return words.startsWith(lead) ? words.slice(lead.length) : words;
}

// A Friend who was invited is named with how they stand, in place of the tag.
function personDrafts(scene: MapScene, standings: ReadonlyMap<string, Standing>): Draft[] {
  const people = [...scene.people.filter((person) => person.me), ...scene.people.filter((person) => !person.me)];
  return people.map(({ userId, name, me, at, source, tag }) => {
    const standing = me ? undefined : standings.get(userId);
    const said = standing === undefined ? (tag ?? (me ? '나' : name)) : `${name} · ${standingWords(standing)}`;
    return {
      id: me ? 'answer:me' : `answer:person:${userId}`,
      name: said,
      position: at,
      planId: null,
      group: 'person',
      symbol: me ? { type: 'me' } : faceOf(name, source === 'timetable', standing),
      tone: 'person',
      title: me ? said : faceTitle(name, said),
      line: null,
      number: null,
    };
  });
}

// What a scene is drawn with beyond itself: the number of the pick, the Plans whose candidates it shows, and how each
// invited Friend stands, by user id.
export interface SceneSetting {
  number: number | null;
  plans: readonly Plan[];
  standings: ReadonlyMap<string, Standing>;
}

const BARE: SceneSetting = { number: null, plans: [], standings: NO_STANDINGS };

// A shuttle stop: its name as the title, and the rest of its tag, such as the shuttle's time, as the line.
function stopDraft({ place, tag }: MapScene['places'][number]): Draft {
  const { label, latitude, longitude } = place;
  return {
    id: `answer:stop:${place.placeId}`,
    name: tag ?? label,
    position: { latitude, longitude },
    planId: null,
    group: 'stop',
    symbol: { type: 'dot', role: 'stop', number: null },
    tone: 'stop',
    title: label,
    line: tag === null || tag === label ? null : restOf(label, tag),
    number: null,
  };
}

function placeDraft(
  { number: pickNumber, plans }: SceneSetting,
  scene: MapScene,
  item: MapScene['places'][number],
): Draft | null {
  const { place, role, tag } = item;
  const title = tag ?? place.label;
  const position = { latitude: place.latitude, longitude: place.longitude };
  const base = { position, planId: null, title, line: null, number: null };
  if (role === 'pick') {
    const flag = scene.flags.find(({ at, role: flagRole }) => flagRole === 'place' && samePoint(at, position));
    const line = flag === undefined ? null : restOf(title, flag.text);
    const name = line === null ? title : `${title} · ${line}`;
    const symbol: AnswerSymbol = { type: 'dot', role, number: pickNumber };
    return {
      ...base,
      id: 'answer:pick',
      name,
      group: role,
      symbol,
      tone: role,
      line,
      number: pickNumber,
    };
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
  if (role === 'stop' || role === 'meeting') {
    return role === 'stop' ? stopDraft(item) : null;
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
    const tone = FLAG_TONES[role];
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
      const list = draft.title === null ? [] : SIDES[draft.group].filter((side) => !taken.has(side));
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
    side === null || title === null ? null : { side, tone, title, line, number: symbol === null ? number : null };
  return { id, name, position, look: { kind: 'answer', symbol, label }, planId, order };
}

// What the map shows for a scene: its marks, its lines, and the points the camera fits.
export function drawingOfScene(scene: MapScene, setting: SceneSetting = BARE): AnswerDrawing {
  const drafts = [
    ...personDrafts(scene, setting.standings),
    ...scene.places.flatMap((place) => placeDraft(setting, scene, place) ?? []),
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
    pick: destinationOf(drafts),
    userIds: scene.people.map(({ userId }) => userId),
  };
}

// What the map shows for the Plan at `planIndex` of an answer: its scene, with the Plan's number on the pick and the
// other Plans as candidates. `standings` holds how each invited Friend stands, by user id, once the Plan was made
// into a Quest.
export function drawingOf(
  answer: AnswerReply,
  planIndex: number,
  standings: ReadonlyMap<string, Standing> = NO_STANDINGS,
): AnswerDrawing {
  const plan = answer.plans[planIndex];
  if (plan === undefined) {
    return { things: [], lines: [], points: [], own: [], pick: null, userIds: [] };
  }
  return drawingOfScene(plan.scene, { number: planIndex + 1, plans: answer.plans, standings });
}

// The looks of every Plan's drawing, each once.
export function looksOf(answer: AnswerReply): MarkerLook[] {
  const looks = answer.plans.flatMap((_, index) => drawingOf(answer, index).things.map(({ look }) => look));
  return looks.filter((look, index) => looks.findIndex((other) => lookName(other) === lookName(look)) === index);
}
