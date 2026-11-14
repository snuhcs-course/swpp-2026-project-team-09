/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useEffectEvent, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapScene } from '@/api/assistant-types';
import { space } from '@/design-system';
import { answerCamera, roomsOf, type ViewArea } from '@/features/assistant/answer-camera';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOf, drawingOfScene, looksOf, nearOwnMark } from '@/features/assistant/answer-marks';
import { withPerson } from '@/features/assistant/plan-input';
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
  type Size,
  useMarkerImages,
  ZOOM_OFFSET,
} from '@/map';
import { ANSWER_PILL, listsTop, type Room } from './layout';
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

function useFraming({ fitZoom }: MainMap, { answerHeight, stage }: Room, pill: boolean): Framing {
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
// stay in. Null until the view is known.
function labelViewOf(drawing: AnswerDrawing, { top, card, pill, view }: Framing): LabelView | null {
  if (view === null) {
    return null;
  }
  const camera = answerCamera(drawing, view.size, paddingOf(top, card, drawing, pill), view.closest);
  return camera === null ? null : { camera, size: view.size, area: labelArea(top, card, view.size, pill) };
}

// Shows the drawing when it comes, and again when the card's height or the stage's size changes: in one glide to the
// camera its labels were placed at. Until the stage is laid out and the map has told its fit zoom, the map fits the
// points itself. No drawing moves nothing, so closing the answer leaves the camera where it is.
function useAnswerCamera(drawing: AnswerDrawing | null, shown: LabelView | null, map: MainMap, framing: Framing): void {
  const { fitAnswer, moveTo } = map;
  const show = useEffectEvent(() => {
    if (drawing === null || drawing.points.length === 0) {
      return;
    }
    if (framing.view === null) {
      fitAnswer(drawing.points, paddingOf(framing.top, framing.card, drawing, framing.pill));
      return;
    }
    if (shown !== null) {
      moveTo(shown.camera);
    }
  });
  useEffect(() => {
    show();
  }, [drawing, framing]);
}

// The Avatars of people the Plan does not draw: Friends and the other people of the User's Party, not the User's own
// nor the shuttle's vehicles. One near one of the Plan's own marks gives way too: the map draws every Avatar above
// every marker, so it would lie over the mark or its words.
function othersOf(avatars: readonly MapAvatar[], cards: readonly CardView[], drawing: AnswerDrawing): MapAvatar[] {
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
}

// The everyday map's Avatars, and the cards that say whose they are.
type EverydayAvatars = { avatars: readonly MapAvatar[]; cards: readonly CardView[] };

// A drawing whose labels' sides are chosen in metres alone, or at a view too.
type Draw = (view: LabelView | null) => AnswerDrawing;

interface Drawn {
  markers: readonly MapMarker[];
  lines: readonly MapLine[];
  // With its labels' sides chosen in metres: its things, points, and people are the same at any view.
  drawing: AnswerDrawing;
}

// A drawing's markers and lines on the map in place of the everyday map's markers, lines, and the User's own Avatar,
// with the camera of an answer. The camera is worked out from the drawing with its sides chosen in metres, and the
// marks are drawn with their sides chosen at that camera. Null while there is nothing to draw. `looks` are asked for
// with the drawing's own, so that a change of drawing never waits for a picture.
function useDrawnMap(draw: Draw | null, looks: readonly MarkerLook[], map: MainMap, framing: Framing): Drawn | null {
  const base = useMemo(() => (draw === null ? null : draw(null)), [draw]);
  const shown = useMemo(() => (base === null ? null : labelViewOf(base, framing)), [base, framing]);
  const drawing = useMemo(() => (draw === null || shown === null ? base : draw(shown)), [draw, base, shown]);
  const things = drawing?.things ?? [];
  const images = useMarkerImages([...things.map(({ look }) => look), ...looks]);
  useAnswerCamera(base, shown, map, framing);
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
  const drawn = useDrawnMap(draw, NO_LOOKS, map, useFraming(map, room, false));
  if (drawn === null) {
    return null;
  }
  const { markers, lines } = drawn;
  return { contents: { markers, lines, avatars: NO_AVATARS }, onPress: ignorePress, nativeMinLevel: ANSWER_MIN_LEVEL };
}

// A press on the Avatar of a Friend whom the conditions do not hold adds the Friend.
function addOnPress({ change }: ShownAnswer, id: string): void {
  const userId = friendIdOf(id);
  if (userId === null) {
    return;
  }
  change((input) => (input.people.some((person) => person.userId === userId) ? input : withPerson(input, userId)));
}

// The Plan on screen drawn on the map in place of the everyday map's markers, lines, the User's own Avatar, and the
// Avatars of the people it draws. Null while no Plan is shown. The looks of every Plan, each at its own camera, are
// asked for when the answer comes, so that the arrows never wait for a picture. Once "이대로 초대" is pressed the faces say how each invited
// Friend stands, and a press changes nothing: the Plan is sent.
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
  const drawn = useDrawnMap(draw, looks, map, framing);
  if (drawn === null) {
    return null;
  }
  const { markers, lines, drawing } = drawn;
  return {
    contents: { markers, lines, avatars: othersOf(everyday.avatars, everyday.cards, drawing) },
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
    nativeMinLevel: ANSWER_MIN_LEVEL,
  };
}
