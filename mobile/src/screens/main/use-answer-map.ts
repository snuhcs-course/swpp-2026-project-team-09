/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapScene } from '@/api/assistant-types';
import { space } from '@/design-system';
import { answerCamera, roomsOf, type ViewArea } from '@/features/assistant/answer-camera';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOf, drawingOfScene, looksOf, nearOwnMark } from '@/features/assistant/answer-marks';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { type CardView, friendIdOf } from '@/features/map/adapter';
import {
  type FitPadding,
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
import { ANSWER_PILL, listsTop, type Room } from './layout';
import { useFaces } from './use-answer-faces';
import type { MainMap } from './use-main-map';

// What the map draws: its markers, its Avatars, and its lines.
export interface MapContents {
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
  lines: readonly MapLine[];
}

const SIDE = 64;
// Between the area an answer's labels stay in and what covers the map at the top and at the bottom, and the edges.
const CLEAR = space[2];
const EDGE = space[4];

// A Plan may span the campus, and on a phone Kakao's level 15, where a campus map's pinch out stops, is closer than
// the lowest zoom of the camera's rules: while a Plan is drawn, a native map may go one level further out.
const ANSWER_MIN_LEVEL = NATIVE_MIN_LEVEL - 1;
// Where the lowest zoom is too close for the Plan's own points, the camera may go out to that level's zoom
// (`nativeLevelZoom`), kept a quarter of a level clear of it: on Android the module shows a view taller than when it
// opened by sending each zoom that much lower (`useScaleShift` in `native-map.tsx`, 0.146 on the emulator).
const ANSWER_OUTER_ZOOM = nativeLevelZoom(ANSWER_MIN_LEVEL) + 0.25;

const NO_LOOKS: readonly MarkerLook[] = [];

type Invited = Pick<PlanInvitation, 'sending' | 'made' | 'standings'>;

// What covers the map at the top under a status bar `top` high: the answer's pill or, for a received invitation, which
// has none, the status bar alone.
function coveredTop(top: number, pill: boolean): number {
  return pill ? top + listsTop(top) + ANSWER_PILL.height : top;
}

// What covers the map at the top and the card at the bottom, each with the clear room of the labels' area
// (`labelArea`) and the room the drawing's marks there need.
export function paddingOf(top: number, cardHeight: number | null, drawing: AnswerDrawing, pill: boolean): FitPadding {
  const { above, below } = roomsOf(drawing);
  return {
    top: coveredTop(top, pill) + CLEAR + above,
    right: SIDE,
    bottom: (cardHeight ?? 0) + CLEAR + below,
    left: SIDE,
  };
}

// The area of a view `size` high and wide that an answer's labels stay in: 8 under the pill or the status bar, 8 over
// the card, and 16 from each side.
export function labelArea(top: number, cardHeight: number | null, size: Size, pill: boolean): ViewArea {
  return {
    top: coveredTop(top, pill) + CLEAR,
    right: size.width - EDGE,
    bottom: size.height - (cardHeight ?? 0) - CLEAR,
    left: EDGE,
  };
}

// What frames an answer on the map: the status bar, the card, the pill or none, and, once the stage is laid out and
// the map has told its fit zoom, the map's view, under the status bar too, with the closest zoom of its camera.
interface Framing {
  top: number;
  card: number | null;
  pill: boolean;
  view: { size: Size; closest: number } | null;
}

export function useFraming({ fitZoom }: MainMap, { answerHeight, stage }: Room, pill: boolean): Framing {
  const { top } = useSafeAreaInsets();
  const width = stage?.width;
  const height = stage?.height;
  return useMemo(() => {
    const known = width !== undefined && height !== undefined && fitZoom !== null;
    const view = known ? { size: { width, height: height + top }, closest: fitZoom + ZOOM_OFFSET.close } : null;
    return { top, card: answerHeight, pill, view };
  }, [top, answerHeight, pill, width, height, fitZoom]);
}

// The camera `answerCamera` works out for a drawing whose labels' sides are chosen in metres, and the area its labels
// stay in. Null until the view is known. The room for labels is measured from the points the camera fits: every point,
// or the Plan's own alone.
function labelViewOf(drawing: AnswerDrawing, { top, card, pill, view }: Framing): LabelView | null {
  if (view === null) {
    return null;
  }
  const padding = paddingOf(top, card, drawing, pill);
  const own = { padding: paddingOf(top, card, { ...drawing, points: drawing.own }, pill), outer: ANSWER_OUTER_ZOOM };
  const camera = answerCamera(drawing, view.size, padding, view.closest, own);
  return camera === null ? null : { camera, size: view.size, area: labelArea(top, card, view.size, pill) };
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
    map.fitAnswer(drawing.points, paddingOf(framing.top, framing.card, drawing, framing.pill));
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

// The Avatars of people the Plan does not draw: Friends and the other people of the User's Party, not the User's own
// nor the shuttle's vehicles. One near one of the Plan's own marks gives way too: the map draws every Avatar above
// every marker, so it would lie over the mark or its words.
export function othersOf(
  avatars: readonly MapAvatar[],
  cards: readonly CardView[],
  drawing: AnswerDrawing,
): MapAvatar[] {
  const others = new Set(
    cards.flatMap(({ id, mark }) => (mark.type === 'person' && !drawing.userIds.includes(mark.id) ? [id] : [])),
  );
  return avatars.filter(({ id, position }) => others.has(id) && !nearOwnMark(drawing, position));
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
// drawn, or the reply of a Lookup, for the camera to tell one that replaced another.
export function useDrawnMap(
  draw: Draw | null,
  base: AnswerDrawing | null,
  answer: object | null,
  looks: readonly MarkerLook[],
  map: MainMap,
  framing: Framing,
): Drawn | null {
  const shown = useMemo(() => (base === null ? null : labelViewOf(base, framing)), [base, framing]);
  const drawing = useMemo(() => (draw === null || shown === null ? base : draw(shown)), [draw, base, shown]);
  const things = drawing?.things ?? [];
  const images = useMarkerImages([...things.map(({ look }) => look), ...looks]);
  useAnswerCamera(base, shown, answer, map, framing);
  if (base === null || drawing === null || things.length === 0) {
    return null;
  }
  const markers = things.flatMap((thing, at): MapMarker[] => {
    const image = images[at];
    const { id, position, planId, order } = thing;
    return image === undefined ? [] : [{ id, name: thing.name, position, image, order, passive: planId === null }];
  });
  return { markers, lines: drawing.lines, drawing: base };
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
  const drawn = useDrawnMap(draw, useBase(draw), null, NO_LOOKS, map, framing);
  if (drawn === null) {
    return null;
  }
  const { markers, lines } = drawn;
  return { contents: { markers, lines, avatars: NO_AVATARS }, onPress: ignorePress, ...ANSWER_LIMITS };
}

// A press on the Avatar of a Friend whom the conditions do not hold adds the Friend.
function addOnPress({ add }: ShownAnswer, id: string): void {
  const userId = friendIdOf(id);
  if (userId !== null) {
    add(userId);
  }
}

// The Plan on screen drawn on the map in place of the everyday map's markers, lines, the User's own Avatar, and the
// Avatars of the people it draws. Null while no Plan is shown. The looks of every Plan, each at its own camera, are
// asked for when the answer comes, so that the arrows never wait for a picture. A Friend's face that a press would add
// carries a "+", and lights while that add is on its way. Once "이대로 초대" is pressed the faces say how each invited
// Friend stands, no face carries a "+", and a press changes nothing: the Plan is sent.
export function useAnswerMap(
  shown: ShownAnswer,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  { sending, made, standings }: Invited,
): AnswerMap | null {
  const { answer, index, show } = shown;
  const draw = useMemo(
    () =>
      answer === null ? null : (view: LabelView | null): AnswerDrawing => drawingOf(answer, index, standings, view),
    [answer, index, standings],
  );
  const framing = useFraming(map, room, true);
  const looks = useMemo(
    () => (answer === null ? NO_LOOKS : looksOf(answer, (drawing) => labelViewOf(drawing, framing))),
    [answer, framing],
  );
  const base = useBase(draw);
  const others = base === null ? NO_AVATARS : othersOf(everyday.avatars, everyday.cards, base);
  const faces = useFaces(others, shown, made !== null);
  const drawn = useDrawnMap(draw, base, answer, looks, map, framing);
  if (drawn === null) {
    return null;
  }
  const { markers, lines, drawing } = drawn;
  return {
    contents: { markers, lines, avatars: faces },
    onPress: (id) => {
      if (sending || made !== null) {
        return;
      }
      const planId = drawing.things.find((thing) => thing.id === id)?.planId ?? null;
      if (planId === null) {
        addOnPress(shown, id);
      } else {
        show(planId);
      }
    },
    ...ANSWER_LIMITS,
  };
}
