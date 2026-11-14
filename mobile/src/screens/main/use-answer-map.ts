/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AnswerReply, PlanInput } from '@/api/assistant-types';
import { answerCamera, roomsOf } from '@/features/assistant/answer-camera';
import { type AnswerDrawing, drawingOf, looksOf, nearOwnMark } from '@/features/assistant/answer-marks';
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
import { SELECTED_ORDER } from './use-things';

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

// How long the drawing and the card's height stay the same before the camera follows an answer that replaced another,
// such as a recalculation's: the card is laid out again after that answer comes, and the camera moves once for both.
const STILL_MS = 120;

// The glide to the camera `answerCamera` works out for the drawing in the view, under a status bar `top` high. Until
// the stage is laid out and the map has told its fit zoom, the map fits the points itself. No drawing, no move.
function showDrawing(
  drawing: AnswerDrawing | null,
  map: MainMap,
  { answerHeight, stage }: Room,
  top: number,
  pill: boolean,
): void {
  if (drawing === null || drawing.points.length === 0) {
    return;
  }
  const padding = paddingOf(top, answerHeight, drawing, pill);
  if (stage === null || map.fitZoom === null) {
    map.fitAnswer(drawing.points, padding);
    return;
  }
  // The map lies under the status bar too.
  const size = { width: stage.width, height: stage.height + top };
  const camera = answerCamera(drawing, size, padding, map.fitZoom + ZOOM_OFFSET.close);
  if (camera !== null) {
    map.moveTo(camera);
  }
}

// Shows the drawing when it comes, and again when the card's height or the stage's size changes. Once an answer has
// replaced another, the glide waits until the drawing and the card's height have stayed the same for `STILL_MS`. No
// drawing moves nothing, so closing the answer leaves the camera where it is.
function useAnswerCamera(
  drawing: AnswerDrawing | null,
  answer: AnswerReply | null,
  map: MainMap,
  room: Room,
  pill: boolean,
): void {
  const { top } = useSafeAreaInsets();
  const { answerHeight, stage } = room;
  const { fitZoom } = map;
  const width = stage?.width;
  const height = stage?.height;
  const followed = useRef<AnswerReply | null>(null);
  const waiting = useRef(false);
  const move = (): void => {
    showDrawing(drawing, map, room, top, pill);
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
  answer: AnswerReply | null,
  looks: readonly MarkerLook[],
  map: MainMap,
  room: Room,
  pill: boolean,
): Omit<MapContents, 'avatars'> | null {
  const things = drawing?.things ?? [];
  const images = useMarkerImages([...things.map(({ look }) => look), ...looks]);
  useAnswerCamera(drawing, answer, map, room, pill);
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
  const drawn = useDrawnMap(drawing, null, NO_LOOKS, map, room, false);
  return drawn === null
    ? null
    : { contents: { ...drawn, avatars: NO_AVATARS }, onPress: ignorePress, nativeMinLevel: ANSWER_MIN_LEVEL };
}

// A press on the Avatar of a Friend whom the conditions do not hold adds the Friend.
function addOnPress({ add }: ShownAnswer, id: string): void {
  const userId = friendIdOf(id);
  if (userId !== null) {
    add(userId);
  }
}

// The face a Friend's Avatar shows while an answer is on screen: the selected look while their add is on its way, and
// a "+" while a press would add them. Anyone else's, and every face once the Plan is sent, is the everyday map's.
function faceOf(
  { id, image: { view } }: MapAvatar,
  input: PlanInput,
  pendingAdd: string | null,
  sent: boolean,
): MarkerLook {
  const userId = friendIdOf(id);
  if (view.kind !== 'person' || userId === null || sent) {
    return view;
  }
  if (userId === pendingAdd) {
    return { ...view, selected: true };
  }
  return input.people.some((person) => person.userId === userId) ? view : { ...view, addable: true };
}

// The Avatars the Plan leaves, with their faces, the lit one above the others. The selected look of each face with a
// "+" is asked for with it, so that a press lights the face at once. A look whose picture is still to be made keeps
// the picture the face has, so that a native map never leaves the face out meanwhile.
function useFaces(avatars: readonly MapAvatar[], { answer, pendingAdd }: ShownAnswer, sent: boolean): MapAvatar[] {
  const looks = avatars.map((avatar) =>
    answer === null ? avatar.image.view : faceOf(avatar, answer.input, pendingAdd, sent),
  );
  const ahead = looks.flatMap((look) =>
    look.kind === 'person' && look.addable === true ? [{ ...look, addable: false, selected: true }] : [],
  );
  const images = useMarkerImages([...looks, ...ahead]);
  return avatars.map((avatar, at) => {
    const image = images[at];
    const look = looks[at];
    const made = image === undefined || (image.uri === null && avatar.image.uri !== null) ? avatar.image : image;
    const lit = look?.kind === 'person' && look.selected === true;
    return { ...avatar, image: made, order: lit ? SELECTED_ORDER : avatar.order };
  });
}

// The Plan on screen drawn on the map in place of the everyday map's markers, lines, the User's own Avatar, and the
// Avatars of the people it draws. Null while no Plan is shown. The looks of every Plan are asked for when the answer
// comes, so that the arrows never wait for a picture. A Friend's face that a press would add carries a "+", and lights
// while that add is on its way. Once "이대로 초대" is pressed the faces say how each invited Friend stands, no face
// carries a "+", and a press changes nothing: the Plan is sent.
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
  const others = drawing === null ? NO_AVATARS : othersOf(everyday.avatars, everyday.cards, drawing);
  const faces = useFaces(others, shown, made !== null);
  const drawn = useDrawnMap(drawing, answer, looks, map, room, true);
  if (drawn === null || drawing === null) {
    return null;
  }
  return {
    contents: { ...drawn, avatars: faces },
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
