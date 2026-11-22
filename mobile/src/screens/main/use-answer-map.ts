/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AnswerReply, MapScene } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { answerCamera } from '@/features/assistant/answer-camera';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOf, drawingOfScene, looksOf } from '@/features/assistant/answer-marks';
import { keptDrawingOf } from '@/features/assistant/kept-drawing';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { CardView } from '@/features/map/adapter';
import {
  type MapAvatar,
  type MapLine,
  type MapMarker,
  type MarkerLook,
  NATIVE_MIN_LEVEL,
  nativeLevelZoom,
  type Size,
  useMarkerImages,
  ZOOM_OFFSET,
} from '@/map';
import { ignoreMark, type OnMark, planPress, pressableWhile, takesNoPress } from './answer-presses';
import { labelArea, paddingOf } from './answer-padding';
import type { Room } from './layout';
import { othersOf, useFacePoints, useFaces } from './use-answer-faces';
import { useChoosingRing } from './use-choosing-ring';

export { othersOf };
import { useAnswerWalks } from './use-answer-walks';
import type { MainMap } from './use-main-map';

export { labelArea, paddingOf } from './answer-padding';

// What the map draws: its markers, its Avatars, and its lines.
export interface MapContents {
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
  lines: readonly MapLine[];
}

// A Plan may span the campus, and on a phone Kakao's level 15, where a campus map's pinch out stops, is closer than
// the lowest zoom of the camera's rules: while a Plan is drawn, a native map may go one level further out.
const ANSWER_MIN_LEVEL = NATIVE_MIN_LEVEL - 1;
// Where the lowest zoom is too close for the Plan's own points, the camera may go out to that level's zoom
// (`nativeLevelZoom`), kept a quarter of a level clear of it: on Android the module shows a view taller than when it
// opened by sending each zoom that much lower (`useScaleShift` in `native-map.tsx`, 0.146 on the emulator).
const ANSWER_OUTER_ZOOM = nativeLevelZoom(ANSWER_MIN_LEVEL) + 0.25;

const NO_LOOKS: readonly MarkerLook[] = [];
const NO_LINES: readonly MapLine[] = [];
const NO_ROUTES: MapScene['routes'] = [];
const NO_POINTS: readonly LatLng[] = [];

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

// What frames an answer on the map: the status bar, the card, the pill or none, and, once the stage is laid out and
// the map has told its fit zoom, the map's view, under the status bar too, with the closest zoom of its camera.
interface Framing {
  top: number;
  card: number | null;
  pill: boolean;
  // The time bar under the pill, 0 for none.
  timeBar: number;
  view: { size: Size; closest: number } | null;
}

export function useFraming({ fitZoom }: MainMap, room: Room, pill: boolean): Framing {
  const { answerHeight, stage, timeBarHeight = 0 } = room;
  const timeBar = pill ? timeBarHeight : 0;
  const { top } = useSafeAreaInsets();
  const width = stage?.width;
  const height = stage?.height;
  return useMemo(() => {
    const known = width !== undefined && height !== undefined && fitZoom !== null;
    const view = known ? { size: { width, height: height + top }, closest: fitZoom + ZOOM_OFFSET.close } : null;
    return { top, card: answerHeight, pill, timeBar, view };
  }, [top, answerHeight, pill, timeBar, width, height, fitZoom]);
}

// The camera `answerCamera` works out for a drawing whose labels' sides are chosen in metres, and the area its labels
// stay in. Null until the view is known. The room for labels is measured from the points the camera fits: every point,
// or the Plan's own alone.
function labelViewOf(
  drawing: AnswerDrawing,
  { top, card, pill, timeBar, view }: Framing,
  avoid: readonly LatLng[] = NO_POINTS,
): LabelView | null {
  if (view === null) {
    return null;
  }
  const padding = paddingOf(top, card, drawing, pill, timeBar);
  const own = drawing.keep ?? drawing.own;
  const ownPadding = paddingOf(top, card, { ...drawing, points: own }, pill, timeBar);
  const camera = answerCamera({ ...drawing, own }, view.size, padding, view.closest, {
    padding: ownPadding,
    outer: ANSWER_OUTER_ZOOM,
  });
  const area = labelArea(top, card, view.size, pill, timeBar);
  return camera === null ? null : { camera, size: view.size, area, avoid };
}

// How long the drawing and the card's height stay the same before the camera follows an answer that replaced another,
// such as a recalculation's: the card is laid out again after that answer comes, and the camera moves once for both.
const STILL_MS = 120;

// The glide to the camera the drawing's labels were placed at. Until the stage is laid out and the map has told its fit
// zoom, the map fits the points itself. No drawing, no move.
function showDrawing(drawing: AnswerDrawing | null, shown: LabelView | null, map: MainMap, framing: Framing): void {
  if (drawing === null || drawing.points.length === 0) {
    return;
  }
  if (framing.view === null) {
    map.fitAnswer(drawing.points, paddingOf(framing.top, framing.card, drawing, framing.pill, framing.timeBar));
    return;
  }
  if (shown !== null) {
    map.moveTo(shown.camera);
  }
}

// Shows the drawing when it comes, and again when the card's height or the stage's size changes. Once an answer has
// replaced another, the glide waits until the drawing and the card's height have stayed the same for `STILL_MS`. No
// drawing moves nothing, so closing the answer leaves the camera where it is.
function useAnswerCamera(
  drawing: AnswerDrawing | null,
  shown: LabelView | null,
  answer: object | null,
  map: MainMap,
  framing: Framing,
): void {
  const followed = useRef<object | null>(null);
  const waiting = useRef(false);
  const move = (): void => {
    showDrawing(drawing, shown, map, framing);
  };
  const follow = useEffectEvent(() => {
    if (followed.current !== null && answer !== null && answer !== followed.current) {
      waiting.current = true;
    }
    followed.current = answer;
    if (!waiting.current) {
      move();
      return null;
    }
    return setTimeout(() => {
      waiting.current = false;
      move();
    }, STILL_MS);
  });
  useEffect(() => {
    const timer = follow();
    return (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [drawing, framing]);
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
}

// The drawing with its labels' sides chosen in metres.
export function useBase(draw: Draw | null): AnswerDrawing | null {
  return useMemo(() => (draw === null ? null : draw(null)), [draw]);
}

// A drawing's markers and lines on the map in place of the everyday map's markers, lines, and the User's own Avatar,
// with the camera of an answer. The camera is worked out from the drawing with its sides chosen in metres (`base`),
// and the marks are drawn with their sides chosen at that camera. Null while there is nothing to draw. `looks` are
// asked for with the drawing's own, so that a change of drawing never waits for a picture. `answer` is the answer
// drawn, or the reply of a Lookup, for the camera to tell one that replaced another. `routes` are those of the scene
// drawn: its walks follow their paths once found (`useAnswerWalks`). Labels keep clear of the faces at `avoid`.
export function useDrawnMap(
  draw: Draw | null,
  base: AnswerDrawing | null,
  answer: object | null,
  looks: readonly MarkerLook[],
  map: MainMap,
  framing: Framing,
  routes: MapScene['routes'] = NO_ROUTES,
  // The marks that take a press although they are no Plan's: those that open a card.
  pressable: (id: string) => boolean = takesNoPress,
  avoid: readonly LatLng[] = NO_POINTS,
): Drawn | null {
  const shown = useMemo(() => (base === null ? null : labelViewOf(base, framing, avoid)), [base, framing, avoid]);
  const drawing = useMemo(() => (draw === null || shown === null ? base : draw(shown)), [draw, base, shown]);
  const things = drawing?.things ?? [];
  const images = useMarkerImages([...things.map(({ look }) => look), ...looks]);
  useAnswerCamera(base, shown, answer, map, framing);
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
  return { markers, lines, drawing: base };
}

export function ignorePress(): void {
  // Nothing of a received invitation's way takes a press, nor, while the frame or that card is shown, the everyday
  // map's markers.
}

const NO_AVATARS: readonly MapAvatar[] = [];

// The invitee's own way of a received invitation drawn as a Plan is, with no Avatar of anyone else: the card says
// that others are shown once the Party is on. Null while there is none to draw.
export function useInvitationMap(scene: MapScene | null, map: MainMap, room: Room): AnswerMap | null {
  const draw = useMemo(
    () => (scene === null ? null : (view: LabelView | null): AnswerDrawing => drawingOfScene(scene, view)),
    [scene],
  );
  const framing = useFraming(map, room, false);
  const drawn = useDrawnMap(draw, useBase(draw), null, NO_LOOKS, map, framing, scene?.routes);
  if (drawn === null) {
    return null;
  }
  const { markers, lines } = drawn;
  return { contents: { markers, lines, avatars: NO_AVATARS }, onPress: ignorePress, ...ANSWER_LIMITS };
}

// The Plan on screen drawn on the map in place of the everyday map's markers, lines, the User's own Avatar, and the
// Avatars of the people it draws. Null while no Plan is shown. The looks of every Plan, each at its own camera, are
// asked for when the answer comes, so that the arrows never wait for a picture. A Friend's face that a press would add
// carries a "+", and lights while that add is on its way. Once "이대로 초대" is pressed the faces say how each invited
// Friend stands, no face carries a "+", and a press changes nothing: the Plan is sent. A press on the pick, before or
// after, opens its card, and one on the User's start or a face of the Plan's people opens theirs before (`onMark`).
export function useAnswerMap(
  shown: ShownAnswer,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  { sending, made, standings, changed, changing, left }: Invited,
  onMark: OnMark = ignoreMark,
): AnswerMap | null {
  const { answer, index } = shown;
  const settled = made !== null || changed !== null;
  // A Plan made or changed wins the drawing over 그대로 두기 (PR 444's review).
  const leftAlone = left !== null && !settled;
  const draw = useMemo(() => {
    if (answer === null) {
      return null;
    }
    if (leftAlone) {
      return keptDrawOf(answer, index);
    }
    const [drawn, at] = settled ? [alone(answer, index), 0] : [answer, index];
    return (view: LabelView | null): AnswerDrawing => drawingOf(drawn, at, standings, view);
  }, [answer, index, standings, settled, leftAlone]);
  const framing = useFraming(map, room, true);
  const looks = useMemo(
    () => (answer === null ? NO_LOOKS : looksOf(answer, (drawing) => labelViewOf(drawing, framing))),
    [answer, framing],
  );
  const base = useBase(draw);
  const others = base === null ? NO_AVATARS : othersOf(everyday.avatars, everyday.cards, base);
  const everydayFaces = useFaces(others, shown, made !== null);
  const faces = leftAlone ? NO_AVATARS : everydayFaces;
  const routes = answer?.plans[index]?.scene.routes;
  // While 바꾸기 is on its way nothing can be chosen either, nor once 그대로 두기 left the Quest as it is.
  const sent = sending || settled || changing || leftAlone;
  const avoid = useFacePoints(faces);
  const ring = useChoosingRing(draw, looks, index);
  const drawn = useDrawnMap(ring.draw, base, answer, ring.looks, map, framing, routes, pressableWhile(sent), avoid);
  if (drawn === null) {
    return null;
  }
  const { markers, lines, drawing } = drawn;
  return {
    contents: { markers, lines, avatars: faces },
    onPress: planPress(drawing, shown, sent, onMark),
    ...ANSWER_LIMITS,
  };
}
