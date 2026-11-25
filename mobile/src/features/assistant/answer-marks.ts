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
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Cuisine, KeptQuest, MapScene, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { type AnswerLabel, type AnswerSymbol } from '@/design-system';
import { koreaDayWord } from '@/korea-time';
import type { MarkerLook } from '@/map';
import { lookName } from '@/map/marker-looks';
import { type AnswerDrawing, type AnswerThing, offset, samePoint } from './answer-drawing';
import {
  candidatesAt,
  destinationOf,
  eitherOrder,
  faceOf,
  faceTitle,
  type Draft,
  DRAW_ORDER,
  FLAG_TONES,
  type Group,
  keptDrafts,
  OWN,
  restOf,
  stopDraft,
  SYMBOL_ORDER,
  unplaced,
  withOpenMarks,
} from './answer-groups';
import { type LabelView, type MarkPoint, placeLabels, UPRIGHT_REACH } from './answer-labels';
import { NO_STANDINGS, type Standing, standingWords } from './invited-friends';
import { candidateDraft, leftOutByRank, pickLine, sideRank } from './answer-candidates';
import { kindShown } from './meal-kinds';
import { drawsMeal, hiddenRoutes, mealDrafts, sceneLines } from './meal-marks';
import type { Ways } from './shuttle-legs';
import { mealPickWords } from './meal-pick';
import { droppedId, type Quiet, quieted, quietWords } from './quiet-places';

export type { AnswerDrawing, AnswerThing } from './answer-drawing';

// Whether a position is so near one of the Plan's own marks that a picture drawn there would lie over the mark or
// its words: within the reach of a label above or below it.
export function nearOwnMark({ own }: Pick<AnswerDrawing, 'own'>, position: LatLng): boolean {
  return own.some((mark) => {
    const { east, north } = offset(mark, position);
    return Math.abs(north) <= UPRIGHT_REACH.along && Math.abs(east) <= UPRIGHT_REACH.across;
  });
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
  // The marks that open something at a press, whose titles end with "›": every one, the pick alone, or none.
  opens?: boolean | 'pick';
  // Marks made beside the scene's own, as the numbered flags of several requests (P04 ticket 09); left out, none.
  drafts?: readonly Draft[];
  // A meal answer's with menus: its candidates are small tags and its pick's label says its walking (the answer
  // screen's redesign, board E1). Left out, not.
  meal?: boolean;
  // The paths its walks were found along and its legs by the shuttle, which a meal Plan's legs are drawn on; left
  // out, none.
  ways?: Ways;
  // A meal answer's places that cannot be done, drawn quiet, and the one pressed (P04 ticket 70); left out, those
  // places carry their words as any mark does.
  quiet?: Quiet;
}

const BARE: SceneSetting = { number: null, plans: [], standings: NO_STANDINGS };

function placeDraft(
  { number: pickNumber, plans, day, kind = null, meal = false }: SceneSetting,
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
    const symbol: AnswerSymbol = { type: 'dot', role, number: pickNumber };
    if (meal && plan !== undefined) {
      const words = mealPickWords(plan, title, kind);
      return { ...base, id: 'answer:pick', group: role, symbol, tone: role, number: pickNumber, ...words };
    }
    const line = pickLine(flag === undefined ? null : restOf(title, flag.text), day, plan, kind);
    const name = line === null ? title : `${title} · ${line}`;
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
    return candidateDraft(plans, item, kind, meal);
  }
  if (role === 'stop' || role === 'meeting') {
    return role === 'stop' ? stopDraft(item) : null;
  }
  const id = role === 'next' ? `answer:next:${place.placeId}` : droppedId(place.label);
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

// One symbol at each point, and the labels placed (`placeLabels`) in the order their kinds take sides, so that the
// Plan's own marks take theirs first.
// A point's symbol: a meal answer's people's marks, the User's own and the Friends' faces, are told apart.
function markPoint(position: LatLng, drawn: Draft | undefined, meal: boolean): MarkPoint {
  const type = drawn?.symbol?.type;
  const point: MarkPoint = { position, symbol: drawn?.position ?? null };
  if (meal && (type === 'face' || type === 'me')) {
    point.person = true;
  }
  return point;
}

// A meal answer's (`meal`) labels keep clear of its people's marks and its held tags give way (P04 ticket 51).
function placeAll(drafts: Draft[], view: LabelView | null, meal: boolean): Placed[] {
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
    // The places one label may stand at are tried in their own order, whatever points they share.
    .toSorted((one, other) => sideRank(one) - sideRank(other) || eitherOrder(drafts, one.draft, other.draft));
  const marks = placed.map(({ draft, point, symbol, held }) => unplaced(draft, point, symbol, held, meal));
  const symbols = points.map(({ position, drawn }) => markPoint(position, drawn, meal));
  const labels = placeLabels(symbols, marks, view);
  // Of the places one label may stand at, only the one it took is drawn.
  const drawn = placed
    .map(({ draft, symbol, held }, at) => ({ draft, symbol, held, label: labels[at] ?? null }))
    .filter(({ draft, label }) => draft.either === undefined || label !== null);
  return leftOutByRank(drawn, view);
}

// A meal candidate's number stands in its tag (it has no `sub`); its dot carries it only when the tag is left out.
function symbolOf({ draft, symbol, label }: Placed): AnswerSymbol | null {
  const tagged = draft.group === 'candidate' && draft.sub === undefined && label !== null;
  return tagged && symbol?.type === 'dot' ? { ...symbol, number: null } : symbol;
}

function thingOf(placed: Placed, order: number): AnswerThing {
  const { id, name, position, planId } = placed.draft;
  return { id, name, position, look: { kind: 'answer', symbol: symbolOf(placed), label: placed.label }, planId, order };
}

// What the map shows for a scene: its marks, its lines, and the points the camera fits. At a view, the labels' sides
// are chosen in its points too.
export function drawingOfScene(
  scene: MapScene,
  view: LabelView | null = null,
  setting: SceneSetting = BARE,
): AnswerDrawing {
  const meal = setting.meal === true && setting.number !== null ? setting.plans[setting.number - 1] : undefined;
  const hidden = hiddenRoutes(meal, scene);
  // A meal pick's label says "메뉴 ›" in place of the "›" after its name.
  const drafts = withOpenMarks(
    meal === undefined ? (setting.opens ?? false) : false,
    mealDrafts(
      meal,
      scene,
      [
        ...personDrafts(scene, setting.standings),
        ...quieted(
          setting,
          scene.places.flatMap((place) => placeDraft(setting, scene, place) ?? []),
        ),
        ...flagDrafts(scene),
        ...keptDrafts(setting.kept),
        ...(setting.drafts ?? []),
      ],
      setting.ways,
    ),
  );
  const placed = placeAll(drafts, view, meal !== undefined).toSorted(
    (one, other) =>
      byGroup(DRAW_ORDER)(one.draft, other.draft) || drafts.indexOf(one.draft) - drafts.indexOf(other.draft),
  );
  const things = placed.map((one, index) => thingOf(one, placed.length - index));
  const routes = scene.routes.filter((_, index) => !hidden.has(index));
  const points = [...things.map(({ position }) => position), ...routes.flatMap(({ from, to }) => [from, to])];
  return {
    things,
    lines: sceneLines(scene, meal !== undefined, setting.ways, hidden),
    points,
    // A meal answer's camera keeps every candidate in view (the answer screen's redesign).
    ...(meal === undefined ? {} : { keep: points }),
    own: drafts.filter(({ group }) => OWN.has(group)).map(({ position }) => position),
    pick: destinationOf(drafts),
    userIds: scene.people.map(({ userId }) => userId),
  };
}

// What the map shows for the Plan at `planIndex` of an answer: its scene, with the Plan's number on the pick and the
// other Plans as candidates. `standings` holds how each invited Friend stands, by user id, once the Plan was made
// into a Quest. At a view, the labels' sides are chosen in its points too. A meal answer's places that cannot be done
// are quiet dots, and the one whose mark's id is `opened` carries its words (P04 ticket 70).
export function drawingOf(
  answer: AnswerReply,
  planIndex: number,
  standings: ReadonlyMap<string, Standing> = NO_STANDINGS,
  view: LabelView | null = null,
  ways?: Ways,
  opened: string | null = null,
): AnswerDrawing {
  const plan = answer.plans[planIndex];
  if (plan === undefined) {
    return { things: [], lines: [], points: [], own: [], pick: null, userIds: [] };
  }
  const day = koreaDayWord(plan.startAt, new Date(plan.band.now));
  return drawingOfScene(plan.scene, view, {
    opens: 'pick',
    number: planIndex + 1,
    plans: answer.plans,
    standings,
    day,
    kind: kindShown(answer),
    kept: answer.planSet,
    meal: drawsMeal(answer),
    quiet: { words: quietWords(answer), opened },
    ...(ways === undefined ? {} : { ways }),
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
