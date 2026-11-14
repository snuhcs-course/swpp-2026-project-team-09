/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useEffectEvent, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { answerCamera, roomsOf } from '@/features/assistant/answer-camera';
import { type AnswerDrawing, drawingOf, looksOf, nearOwnMark } from '@/features/assistant/answer-marks';
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

// A Plan may span the campus, and on a phone Kakao's level 15, where a campus map's pinch out stops, is closer than
// the lowest zoom of the camera's rules: while a Plan is drawn, a native map may go one level further out.
const ANSWER_MIN_LEVEL = NATIVE_MIN_LEVEL - 1;

const NO_LOOKS: readonly MarkerLook[] = [];

type Invited = Pick<PlanInvitation, 'sending' | 'made' | 'standings'>;

// What covers the map at the top under a status bar `top` high, the answer's pill or, for a received invitation, which
// has none, nothing, and the card at the bottom, each with the room the drawing's marks there need.
export function paddingOf(top: number, cardHeight: number | null, drawing: AnswerDrawing, pill: boolean): FitPadding {
  const { above, below } = roomsOf(drawing);
  return {
    top: (pill ? top + listsTop(top) + ANSWER_PILL.height : top) + above,
    right: SIDE,
    bottom: (cardHeight ?? 0) + below,
    left: SIDE,
  };
}

// Shows the drawing when it comes, and again when the card's height or the stage's size changes: in one glide to the
// camera `answerCamera` works out for the view. Until the stage is laid out and the map has told its fit zoom, the
// map fits the points itself. No drawing moves nothing, so closing the answer leaves the camera where it is.
function useAnswerCamera(
  drawing: AnswerDrawing | null,
  map: MainMap,
  { answerHeight, stage }: Room,
  pill: boolean,
): void {
  const { top } = useSafeAreaInsets();
  const { fitAnswer, moveTo, fitZoom } = map;
  const width = stage?.width;
  const height = stage?.height;
  const show = useEffectEvent(() => {
    if (drawing === null || drawing.points.length === 0) {
      return;
    }
    const padding = paddingOf(top, answerHeight, drawing, pill);
    if (stage === null || fitZoom === null) {
      fitAnswer(drawing.points, padding);
      return;
    }
    // The map lies under the status bar too.
    const size = { width: stage.width, height: stage.height + top };
    const camera = answerCamera(drawing, size, padding, fitZoom + ZOOM_OFFSET.close);
    if (camera !== null) {
      moveTo(camera);
    }
  });
  useEffect(() => {
    show();
  }, [drawing, top, answerHeight, width, height, fitZoom]);
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

// A drawing's markers and lines on the map in place of the everyday map's markers, lines, and the User's own Avatar,
// with the camera of an answer, under the answer's `pill` or none. Null while there is nothing to draw. `looks` are
// asked for with the drawing's own, so that a change of drawing never waits for a picture.
function useDrawnMap(
  drawing: AnswerDrawing | null,
  looks: readonly MarkerLook[],
  map: MainMap,
  room: Room,
  pill: boolean,
): Omit<MapContents, 'avatars'> | null {
  const things = drawing?.things ?? [];
  const images = useMarkerImages([...things.map(({ look }) => look), ...looks]);
  useAnswerCamera(drawing, map, room, pill);
  if (drawing === null || things.length === 0) {
    return null;
  }
  const markers = things.flatMap((thing, at): MapMarker[] => {
    const image = images[at];
    const { id, position, planId, order } = thing;
    return image === undefined ? [] : [{ id, name: thing.name, position, image, order, passive: planId === null }];
  });
  return { markers, lines: drawing.lines };
}

export function ignorePress(): void {
  // Nothing of a received invitation's way takes a press, nor, while the frame or that card is shown, the everyday
  // map's markers.
}

const NO_AVATARS: readonly MapAvatar[] = [];

// The invitee's own way of a received invitation drawn as a Plan is, with no Avatar of anyone else: the card says
// that others are shown once the Party is on. Null while there is none to draw.
export function useInvitationMap(drawing: AnswerDrawing | null, map: MainMap, room: Room): AnswerMap | null {
  const drawn = useDrawnMap(drawing, NO_LOOKS, map, room, false);
  return drawn === null
    ? null
    : { contents: { ...drawn, avatars: NO_AVATARS }, onPress: ignorePress, nativeMinLevel: ANSWER_MIN_LEVEL };
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
// Avatars of the people it draws. Null while no Plan is shown. The looks of every Plan are asked for when the answer
// comes, so that the arrows never wait for a picture. Once "이대로 초대" is pressed the faces say how each invited
// Friend stands, and a press changes nothing: the Plan is sent.
export function useAnswerMap(
  shown: ShownAnswer,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  { sending, made, standings }: Invited,
): AnswerMap | null {
  const { answer, index, show } = shown;
  const drawing = useMemo(
    () => (answer === null ? null : drawingOf(answer, index, standings)),
    [answer, index, standings],
  );
  const looks = useMemo(() => (answer === null ? NO_LOOKS : looksOf(answer)), [answer]);
  const drawn = useDrawnMap(drawing, looks, map, room, true);
  if (drawn === null || drawing === null) {
    return null;
  }
  return {
    contents: { ...drawn, avatars: othersOf(everyday.avatars, everyday.cards, drawing) },
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
