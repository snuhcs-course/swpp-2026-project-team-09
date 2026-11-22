/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Cuisine, KeptQuest, MapScene, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { type AnswerLabel, type AnswerSymbol, type FaceBadge } from '@/design-system';
import { koreaDayWord } from '@/korea-time';
import type { MarkerLook } from '@/map';
import { lookName } from '@/map/marker-looks';
import { type AnswerDrawing, type AnswerThing, metresBetween, offset } from './answer-drawing';
import {
  destinationOf,
  faceTitle,
  type Draft,
  DRAW_ORDER,
  FLAG_TONES,
  type Group,
  keptDrafts,
  OWN,
  restOf,
  ROUTE_STYLES,
  SIDES,
  stopDraft,
  SYMBOL_ORDER,
  withOpenMarks,
} from './answer-groups';
import { type LabelView, placeLabels, type Unplaced, UPRIGHT_REACH } from './answer-labels';
import { routeLineId } from './answer-walks';
import { NO_STANDINGS, type Standing, standingWords } from './invited-friends';
import { candidateDraft, leftOutByRank, pickLine, sideRank } from './answer-candidates';
import { kindShown } from './meal-kinds';

export type { AnswerDrawing, AnswerThing } from './answer-drawing';

const ONE_POINT = 15;

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

type Face = Extract<AnswerSymbol, { type: 'face' }>;

function faceOf(name: string, source: MapScene['people'][number]['source'], standing: Standing | undefined): Face {
  const badge = standing === undefined ? undefined : BADGES[standing.state];
  const face: Face = {
    type: 'face',
    name,
    dashed: source === 'timetable',
    ...(source === 'exact' ? { exact: true } : {}),
  };
  return badge === undefined ? face : { ...face, badge };
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
      symbol: me ? { type: 'me' } : faceOf(name, source, standing),
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
  // The Plan's day before the pick's time when it is not the day asked ("내일(수)"); left out, none.
  day?: string;
  // The Quest already set that the answer stands beside (P04 ticket 20); left out, none.
  kept?: KeptQuest | null;
  // The kind of food on screen, whose candidates stand out; left out, none.
  kind?: Cuisine | null;
  // Every mark opens something at a press, so each title ends with "›"; left out, none.
  opens?: boolean;
  // Marks made beside the scene's own, as the numbered flags of several requests (P04 ticket 09); left out, none.
  drafts?: readonly Draft[];
}

const BARE: SceneSetting = { number: null, plans: [], standings: NO_STANDINGS };

function placeDraft(
  { number: pickNumber, plans, day, kind = null }: SceneSetting,
  scene: MapScene,
  item: MapScene['places'][number],
): Draft | null {
  const { place, role, tag } = item;
  const title = tag ?? place.label;
  const position = { latitude: place.latitude, longitude: place.longitude };
  const base = { position, planId: null, title, line: null, number: null };
  if (role === 'pick') {
    const flag = scene.flags.find(({ at, role: flagRole }) => flagRole === 'place' && samePoint(at, position));
    const plan = pickNumber === null ? undefined : plans[pickNumber - 1];
    const line = pickLine(flag === undefined ? null : restOf(title, flag.text), day, plan, kind);
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
    return candidateDraft(plans, item, kind);
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

interface Placed {
  draft: Draft;
  symbol: AnswerSymbol | null;
  label: AnswerLabel | null;
}

// A draft at the point of that index, its label without its side: a candidate carries its number in it, as the pick
// does when its dot is not drawn, so that a tag read alone says which candidate it is (the list of ticket 15 uses the
// same numbers). The pick's label is kept, the answer's main mark, and so is a held candidate's, whose tag is its own
// way to be pressed (`held`).
function unplaced(draft: Draft, point: number, symbol: AnswerSymbol | null, held: boolean): Unplaced {
  const { position, group, tone, title, line, sub = null, number } = draft;
  const words =
    title === null
      ? null
      : {
          tone,
          title,
          line,
          ...(sub === null ? {} : { sub }),
          number: group === 'candidate' || symbol === null ? number : null,
        };
  return { point, position, words, sides: SIDES[group], kept: group === 'pick' || held };
}

function candidatesAt(here: readonly Draft[]): number {
  return here.filter(({ group }) => group === 'candidate').length;
}

// One symbol at each point, and the labels placed (`placeLabels`) in the order their kinds take sides, so that the
// Plan's own marks take theirs first.
function placeAll(drafts: Draft[], view: LabelView | null): Placed[] {
  const points = pointsOf(drafts).map(({ position, drafts: here }) => ({
    position,
    here,
    drawn: here.filter(({ symbol }) => symbol !== null).toSorted(byGroup(SYMBOL_ORDER))[0],
  }));
  const placed = points
    .flatMap(({ here, drawn }, point) =>
      here.map((draft) => ({
        draft,
        point,
        symbol: draft === drawn ? draft.symbol : null,
        // Held: it shares its point with another candidate, two restaurants of one building, or its dot is not drawn,
        // as one on the User's, a Friend's, or the pick's point.
        held: draft.group === 'candidate' && (candidatesAt(here) > 1 || draft !== drawn),
      })),
    )
    .toSorted((one, other) => sideRank(one) - sideRank(other));
  const marks = placed.map(({ draft, point, symbol, held }) => unplaced(draft, point, symbol, held));
  const symbols = points.map(({ position, drawn }) => ({ position, symbol: drawn?.position ?? null }));
  const labels = placeLabels(symbols, marks, view);
  return leftOutByRank(
    placed.map(({ draft, symbol, held }, at) => ({ draft, symbol, held, label: labels[at] ?? null })),
    view,
  );
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
  const drafts = withOpenMarks(setting.opens === true, [
    ...personDrafts(scene, setting.standings),
    ...scene.places.flatMap((place) => placeDraft(setting, scene, place) ?? []),
    ...flagDrafts(scene),
    ...keptDrafts(setting.kept),
    ...(setting.drafts ?? []),
  ]);
  const placed = placeAll(drafts, view).toSorted(
    (one, other) =>
      byGroup(DRAW_ORDER)(one.draft, other.draft) || drafts.indexOf(one.draft) - drafts.indexOf(other.draft),
  );
  const things = placed.map((one, index) => thingOf(one, placed.length - index));
  const lines = scene.routes.map(({ role, from, to }, index) => ({
    id: routeLineId(index),
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
  const day = koreaDayWord(plan.startAt, new Date(plan.band.now));
  return drawingOfScene(plan.scene, view, {
    number: planIndex + 1,
    plans: answer.plans,
    standings,
    day,
    kind: kindShown(answer),
    kept: answer.planSet,
  });
}

// The looks of every Plan's drawing, each once: at the view `viewOf` gives for the Plan's drawing with its sides
// chosen in metres, or with those sides.
export function looksOf(
  answer: AnswerReply,
  viewOf: (drawing: AnswerDrawing) => LabelView | null = (): null => null,
): MarkerLook[] {
  const looks = answer.plans.flatMap((_, index) => {
    const view = viewOf(drawingOf(answer, index));
    return drawingOf(answer, index, NO_STANDINGS, view).things.map(({ look }) => look);
  });
  return looks.filter((look, index) => looks.findIndex((other) => lookName(other) === lookName(look)) === index);
}
