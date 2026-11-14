/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { type AnswerLabel, type AnswerSymbol, color, type FaceBadge, type LabelSide } from '@/design-system';
import type { MarkerLook } from '@/map';
import { lookName } from '@/map/marker-looks';
import type { AnswerDrawing, AnswerThing } from './answer-drawing';
import { labelsAt, type LabelView, offset, sharedEdges, type Unplaced, UPRIGHT_REACH } from './answer-labels';
import { NO_STANDINGS, type Standing, standingWords } from './invited-friends';

export type { AnswerDrawing, AnswerThing } from './answer-drawing';

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
  // Null for a mark that takes no label.
  title: string | null;
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

const ONE_POINT = 15;
// How many characters of a name a face shows (`MapAnswerMark`).
const FACE_LETTERS = 2;

// The metres in a straight line from one position to another.
export function metresBetween(from: LatLng, to: LatLng): number {
  const { east, north } = offset(from, to);
  return Math.hypot(east, north);
}

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
  if (tag === name) {
    return null;
  }
  const lead = `${name} · `;
  return tag.startsWith(lead) ? tag.slice(lead.length) : tag;
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
    const name = flag === undefined ? title : `${title} · ${flag.text}`;
    const symbol: AnswerSymbol = { type: 'dot', role, number: pickNumber };
    return {
      ...base,
      id: 'answer:pick',
      name,
      group: role,
      symbol,
      tone: role,
      line: flag?.text ?? null,
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

interface Placed {
  draft: Draft;
  symbol: AnswerSymbol | null;
  label: AnswerLabel | null;
}

// A draft's label without its side: a pick or a candidate whose dot is not drawn carries its number in it.
function unplaced({ position, group, tone, title, line, number }: Draft, symbol: AnswerSymbol | null): Unplaced {
  const words = title === null ? null : { tone, title, line, number: symbol === null ? number : null };
  return { position, words, sides: SIDES[group] };
}

// One symbol at a point, each label at its side (`labelsAt`), and at a view the edges labels share.
function placeAll(drafts: Draft[], view: LabelView | null): Placed[] {
  const points = pointsOf(drafts);
  const placed = points.flatMap(({ position, drafts: here }, index) => {
    const others = points.filter((_, other) => other !== index).map((other) => other.position);
    const drawn = here.filter(({ symbol }) => symbol !== null).toSorted(byGroup(SYMBOL_ORDER))[0];
    const ordered = here.toSorted(byGroup(SIDE_ORDER));
    const symbols = ordered.map((draft) => (draft === drawn ? draft.symbol : null));
    const marks = ordered.map((draft, at) => unplaced(draft, symbols[at] ?? null));
    const labels = labelsAt(position, others, marks, view);
    return ordered.map((draft, at) => ({ draft, symbol: symbols[at] ?? null, label: labels[at] ?? null }));
  });
  const marks = placed.map(({ draft, label }) => ({ position: draft.position, label }));
  const labels = sharedEdges(view, marks);
  return placed.map(({ draft, symbol }, at) => ({ draft, symbol, label: labels[at] ?? null }));
}

function thingOf({ draft, symbol, label }: Placed, order: number): AnswerThing {
  const { id, name, position, planId } = draft;
  return { id, name, position, look: { kind: 'answer', symbol, label }, planId, order };
}

// What the map shows for a scene: its marks, its lines, and the points the camera fits. At a view, the labels' sides
// are chosen in its points too.
export function drawingOfScene(
  scene: MapScene,
  view: LabelView | null = null,
  setting: SceneSetting = BARE,
): AnswerDrawing {
  const drafts = [
    ...personDrafts(scene, setting.standings),
    ...scene.places.flatMap((place) => placeDraft(setting, scene, place) ?? []),
    ...flagDrafts(scene),
  ];
  const placed = placeAll(drafts, view).toSorted(
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

// What the map shows for the Plan at `planIndex` of an answer: its scene, with the Plan's number on the pick and the
// other Plans as candidates. `standings` holds how each invited Friend stands, by user id, once the Plan was made
// into a Quest. At a view, the labels' sides are chosen in its points too.
export function drawingOf(
  answer: AnswerReply,
  planIndex: number,
  standings: ReadonlyMap<string, Standing> = NO_STANDINGS,
  view: LabelView | null = null,
): AnswerDrawing {
  const plan = answer.plans[planIndex];
  if (plan === undefined) {
    return { things: [], lines: [], points: [], own: [], pick: null, userIds: [] };
  }
  return drawingOfScene(plan.scene, view, { number: planIndex + 1, plans: answer.plans, standings });
}

function noView(): LabelView | null {
  return null;
}

// The looks of every Plan's drawing, each once: at the view `viewOf` gives for the Plan's drawing with its sides
// chosen in metres, or with those sides.
export function looksOf(
  answer: AnswerReply,
  viewOf: (drawing: AnswerDrawing) => LabelView | null = noView,
): MarkerLook[] {
  const looks = answer.plans.flatMap((_, index) => {
    const view = viewOf(drawingOf(answer, index));
    return drawingOf(answer, index, NO_STANDINGS, view).things.map(({ look }) => look);
  });
  return looks.filter((look, index) => looks.findIndex((other) => lookName(other) === lookName(look)) === index);
}
