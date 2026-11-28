/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useEffectEvent, useMemo } from 'react';
import type { AnswerReply, MapScene } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import type { Draft } from '@/features/assistant/answer-groups';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOf, drawingOfScene } from '@/features/assistant/answer-marks';
import type { Standing } from '@/features/assistant/invited-friends';
import { keptDrawingOf } from '@/features/assistant/kept-drawing';
import { drawsMeal } from '@/features/assistant/meal-marks';
import type { Ways } from '@/features/assistant/shuttle-legs';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { CardView } from '@/features/map/adapter';
import { type MapAvatar, type MapLine, type MapMarker, type MarkerLook, NATIVE_MIN_LEVEL } from '@/map';
import { ignoreMark, type OnMark, planPress, pressableWhile, takesNoPress } from './answer-presses';
import {
  ANSWER_MIN_LEVEL,
  ANSWER_OUTER_ZOOM,
  type Framing,
  labelViewOf,
  useFraming,
  useHeldViews,
} from './answer-framing';
import { type Frame, useFramedCamera } from './framed-camera';
import type { Room } from './layout';
import { facesClearOf, othersOf, useFacePoints, useFaces } from './use-answer-faces';

export { othersOf };
import { useAnswerWalks, useMealWays } from './use-answer-walks';
import type { MainMap } from './use-main-map';
import { looksKey, useMadeDrawing, useRestedView } from './use-rested-labels';

export { labelArea, paddingOf } from './answer-padding';
export { useFraming } from './answer-framing';

// What the map draws: its markers, its Avatars, and its lines.
export interface MapContents {
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
  lines: readonly MapLine[];
}

const NO_LOOKS: readonly MarkerLook[] = [];
const NO_LINES: readonly MapLine[] = [];
const NO_ROUTES: MapScene['routes'] = [];
const NO_POINTS: readonly LatLng[] = [];
const NO_DRAFTS: readonly Draft[] = [];

// Marks drawn beside an answer's own, in its drawing, so that its labels keep clear of them and its camera keeps them in
// sight: the other steps of several requests beside the step shown as its answer alone (P03 ticket 26). A press on one
// goes to `press`.
export interface Beside {
  drafts: readonly Draft[];
  press: (id: string) => void;
}

function isBeside(beside: Beside | null, id: string): boolean {
  return beside !== null && beside.drafts.some((draft) => draft.id === id);
}

// The answer's presses, with a press on a mark beside its own sent to that mark's `press`.
function withBeside(onPress: (id: string) => void, beside: Beside | null): (id: string) => void {
  return (id) => {
    if (beside !== null && isBeside(beside, id)) {
      beside.press(id);
    } else {
      onPress(id);
    }
  };
}

type Invited = Pick<PlanInvitation, 'sending' | 'made' | 'standings' | 'changed' | 'changing' | 'left'>;

// A Plan made or changed (P04 ticket 17) draws only itself: nothing can be chosen any more, so the other candidates and
// the places that did not fit go, from the answer and from the Plan's own scene, and so does the Quest it replaced.
function alone(answer: AnswerReply, index: number): AnswerReply {
  const plan = answer.plans[index];
  if (plan === undefined) {
    return answer;
  }
  const places = plan.scene.places.filter(({ role }) => role !== 'candidate' && role !== 'dropped');
  return { ...answer, plans: [{ ...plan, scene: { ...plan.scene, places } }], dropped: [], planSet: null };
}

// Once 그대로 두기 left a Quest already set as it is (P04 ticket 20), its tag is the only mark beside the User's own
// (`keptDrawingOf`); with no point, nothing is drawn.
function keptDrawOf(answer: AnswerReply, index: number): ((view: LabelView | null) => AnswerDrawing) | null {
  const base = keptDrawingOf(answer, index);
  return base === null ? null : (view: LabelView | null): AnswerDrawing => keptDrawingOf(answer, index, view) ?? base;
}

// The drawing of the Plan on screen: alone once made or changed, the kept Quest's tag once left as it is, else the
// answer's with its other Plans as candidates. Null with no answer.
function drawOf(
  answer: AnswerReply | null,
  index: number,
  standings: ReadonlyMap<string, Standing>,
  { settled, leftAlone }: { settled: boolean; leftAlone: boolean },
  beside: readonly Draft[],
  ways?: Ways,
): Draw | null {
  if (answer === null) {
    return null;
  }
  if (leftAlone) {
    return keptDrawOf(answer, index);
  }
  const [drawn, at] = settled ? [alone(answer, index), 0] : [answer, index];
  return (view: LabelView | null): AnswerDrawing => drawingOf(drawn, at, standings, view, ways, beside);
}

export interface AnswerMap {
  contents: MapContents;
  // A press on a candidate's mark shows its Plan, and one on the Avatar of a Friend not in the conditions adds the
  // Friend; any other press does nothing.
  onPress: (id: string) => void;
  nativeMinLevel: number;
  // Left out, the camera's rules' lowest zoom (`MapProps`).
  outerZoom?: number;
}

type Limits = Pick<AnswerMap, 'nativeMinLevel' | 'outerZoom'>;

export const ANSWER_LIMITS: Limits = { nativeMinLevel: ANSWER_MIN_LEVEL, outerZoom: ANSWER_OUTER_ZOOM };
const EVERYDAY_LIMITS: Limits = { nativeMinLevel: NATIVE_MIN_LEVEL };
// A native map measures its camera back with a little noise: a zoom less than this under the lowest zoom is at it, as
// the module counts it (`CameraRules.same`).
const STILL_ZOOM = 0.01;

// The limits of the everyday map's camera. A camera an answer or a received invitation's way left further out than the
// everyday map's lowest zoom first glides in to that zoom at the same centre, and the answer's limits stay until it
// rests there: dropped at once, they would make the native map jump back.
export function useEverydayLimits({ camera, fitZoom, moveTo }: MainMap, drawn: boolean): Limits {
  const target =
    !drawn && camera !== null && fitZoom !== null && camera.zoom < fitZoom - STILL_ZOOM
      ? { centre: camera.centre, zoom: fitZoom }
      : null;
  const out = target !== null;
  const glide = useEffectEvent(() => {
    if (target !== null) {
      moveTo(target);
    }
  });
  // Again whenever the camera rests short of it.
  useEffect(() => {
    glide();
  }, [out, camera]);
  return out ? ANSWER_LIMITS : EVERYDAY_LIMITS;
}

// The everyday map's Avatars, and the cards that say whose they are.
export type EverydayAvatars = { avatars: readonly MapAvatar[]; cards: readonly CardView[] };

// A drawing whose labels' sides are chosen in metres alone, or at a view too.
type Draw = (view: LabelView | null) => AnswerDrawing;

interface Drawn {
  markers: readonly MapMarker[];
  lines: readonly MapLine[];
  // With its labels' sides chosen in metres: its things, points, and people are the same at any view.
  drawing: AnswerDrawing;
  // As drawn, at the view it is shown at.
  placed: AnswerDrawing;
  view: LabelView | null;
}

// The drawing with its labels' sides chosen in metres.
export function useBase(draw: Draw | null): AnswerDrawing | null {
  return useMemo(() => (draw === null ? null : draw(null)), [draw]);
}

// A drawing's markers and lines on the map in place of the everyday map's markers, lines, and the User's own Avatar,
// with the camera of an answer. The camera is worked out from the drawing with its sides chosen in metres (`base`),
// and the marks are drawn with their sides chosen at that camera, and again at the camera where the map comes to rest
// after it (`useRestedView`, P04 ticket 69), once their pictures are made (`useMadeDrawing`). Null while there is
// nothing to draw. `looks` are asked for with the drawing's own, so that a change of drawing never waits for a
// picture. `frame` says what the camera frames, and when (`useFramedCamera`, P10 ticket 30).
// `routes` are those of the scene drawn: its walks follow their paths once found (`useAnswerWalks`). Labels keep clear
// of the faces at `avoid`.
export function useDrawnMap(
  draw: Draw | null,
  base: AnswerDrawing | null,
  frame: Frame,
  looks: readonly MarkerLook[],
  map: MainMap,
  framing: Framing,
  routes: MapScene['routes'] = NO_ROUTES,
  // The marks that take a press although they are no Plan's: those that open a card.
  pressable: (id: string) => boolean = takesNoPress,
  avoid: readonly LatLng[] = NO_POINTS,
  // A view kept in place of the drawing's own, as a meal answer's while another place is chosen.
  held: LabelView | null = null,
): Drawn | null {
  const shown = useMemo(
    () => held ?? (base === null ? null : labelViewOf(base, framing, avoid)),
    [held, base, framing, avoid],
  );
  const placedAt = useRestedView(shown, map.camera);
  const next = useMemo(() => (draw === null || placedAt === null ? base : draw(placedAt)), [draw, base, placedAt]);
  const baseKey = useMemo(() => looksKey(base), [base]);
  const { drawing, view, images } = useMadeDrawing(baseKey, next, placedAt, looks);
  const things = drawing?.things ?? [];
  useFramedCamera(base, shown, frame, map, framing);
  const lines = useAnswerWalks(drawing?.lines ?? NO_LINES, routes);
  if (base === null || drawing === null || things.length === 0) {
    return null;
  }
  const markers = things.flatMap((thing, at): MapMarker[] => {
    const image = images[at];
    const { id, position, planId, order } = thing;
    return image === undefined
      ? []
      : [{ id, name: thing.name, position, image, order, passive: planId === null && !pressable(id) }];
  });
  return { markers, lines, drawing: base, placed: drawing, view };
}

export function ignorePress(): void {
  // Nothing of a received invitation's way takes a press, nor, while the frame or that card is shown, the everyday
  // map's markers.
}

const NO_AVATARS: readonly MapAvatar[] = [];

// What a way's camera frames: its places, where they are. A poll that brings the same way again frames nothing.
function sceneKeyOf(scene: MapScene | null): string | null {
  return scene === null
    ? null
    : scene.places.map(({ place, role }) => `${role}:${String(place.latitude)},${String(place.longitude)}`).join('|');
}

// The invitee's own way of a received invitation drawn as a Plan is, with no Avatar of anyone else: the card says
// that others are shown once the Party is on. Null while there is none to draw.
export function useInvitationMap(scene: MapScene | null, map: MainMap, room: Room): AnswerMap | null {
  const draw = useMemo(
    () => (scene === null ? null : (view: LabelView | null): AnswerDrawing => drawingOfScene(scene, view)),
    [scene],
  );
  const framing = useFraming(map, room, false);
  const frame = { key: { reply: sceneKeyOf(scene), chosen: [] }, from: scene };
  const drawn = useDrawnMap(draw, useBase(draw), frame, NO_LOOKS, map, framing, scene?.routes);
  if (drawn === null) {
    return null;
  }
  const { markers, lines } = drawn;
  return { contents: { markers, lines, avatars: NO_AVATARS }, onPress: ignorePress, ...ANSWER_LIMITS };
}

// A Plan's framing: for the reply, and again for the Plan chosen, its menu opened or closed, the Plan made or left as
// it is, and a recalculation that brings other places; one that keeps the places frames nothing.
function planFrame(
  { source, answer, index, menuFor }: ShownAnswer,
  settled: boolean,
  leftAlone: boolean,
  active: boolean,
): Frame {
  const plan = answer?.plans[index];
  const chosen = [plan?.id ?? index, sceneKeyOf(plan?.scene ?? null), menuFor, settled, leftAlone];
  return { key: { reply: source, chosen }, from: answer, active };
}

// The Plan on screen's drawing, and the same with its ways (`drawOf`). A meal Plan's legs are drawn, and say their
// minutes, on the ways it is gone (`meal-marks.ts`); no other answer asks for them.
function useDraws(
  { answer, index }: ShownAnswer,
  standings: ReadonlyMap<string, Standing>,
  { settled, leftAlone }: { settled: boolean; leftAlone: boolean },
  besides: readonly Draft[],
): { plain: Draw | null; draw: Draw | null } {
  const ways = useMealWays(answer !== null && drawsMeal(answer) ? answer.plans[index] : undefined);
  const plain = useMemo(
    () => drawOf(answer, index, standings, { settled, leftAlone }, besides),
    [answer, index, standings, settled, leftAlone, besides],
  );
  const draw = useMemo(
    () => drawOf(answer, index, standings, { settled, leftAlone }, besides, ways),
    [answer, index, standings, settled, leftAlone, besides, ways],
  );
  return { plain, draw };
}

// The Plan on screen drawn on the map in place of the everyday map's markers, lines, the User's own Avatar, and the
// Avatars of the people it draws. Null while no Plan is shown. The looks of every Plan, each at its own camera, are
// asked for when the answer comes, so that the arrows never wait for a picture. A Friend's face that a press would add
// carries a "+", and lights while that add is on its way. Once "이대로 초대" is pressed the faces say how each invited
// Friend stands, no face carries a "+", and a press changes nothing: the Plan is sent. A press on the pick, before or
// after, opens its card, and one on the User's start or a face of the Plan's people opens theirs before (`onMark`).
// Marks `beside` it are drawn with it and take their own press.
export function useAnswerMap(
  shown: ShownAnswer,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  { sending, made, standings, changed, changing, left }: Invited,
  onMark: OnMark = ignoreMark,
  // Whether the map shows this answer, not a scene the app made over it (`Frame`).
  active = true,
  beside: Beside | null = null,
): AnswerMap | null {
  const { answer, index } = shown;
  const settled = made !== null || changed !== null;
  // A Plan made or changed wins the drawing over 그대로 두기 (PR 444's review).
  const leftAlone = left !== null && !settled;
  const routes = answer?.plans[index]?.scene.routes;
  const besides = beside?.drafts ?? NO_DRAFTS;
  const { plain, draw } = useDraws(shown, standings, { settled, leftAlone }, besides);
  const framing = useFraming(map, room, true);
  // The camera is worked out without the ways, so that it stays put while their paths come.
  const base = useBase(plain);
  const others = base === null ? NO_AVATARS : othersOf(everyday.avatars, everyday.cards, base);
  const everydayFaces = useFaces(others, shown, made !== null);
  const faces = leftAlone ? NO_AVATARS : everydayFaces;
  // While 바꾸기 is on its way nothing can be chosen either, nor once 그대로 두기 left the Quest as it is.
  const sent = sending || settled || changing || leftAlone;
  const avoid = useFacePoints(faces);
  const { held, looks } = useHeldViews(answer, sent, standings, framing, avoid, base, besides);
  const own = pressableWhile(sent);
  const press = (id: string): boolean => own(id) || isBeside(beside, id);
  const frame = planFrame(shown, settled, leftAlone, active);
  const drawn = useDrawnMap(draw, base, frame, looks, map, framing, routes, press, avoid, held);
  if (drawn === null) {
    return null;
  }
  const { markers, lines, drawing, placed, view } = drawn;
  return {
    contents: { markers, lines, avatars: facesClearOf(faces, placed, view) },
    onPress: withBeside(planPress(drawing, shown, sent, onMark), beside),
    ...ANSWER_LIMITS,
  };
}
