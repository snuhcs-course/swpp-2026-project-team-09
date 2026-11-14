/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { useEffect, useEffectEvent, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { answerCamera } from '@/features/assistant/answer-camera';
import { type AnswerDrawing, drawingOf, looksOf, nearOwnMark } from '@/features/assistant/answer-marks';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { CardView } from '@/features/map/adapter';
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

// Room for a label above a point, a flag of one line, and below one, the picked Restaurant's two lines, each with
// half the symbol box.
const ROOM_ABOVE = 56;
const ROOM_BELOW = 72;
const SIDE = 64;

// A Plan may span the campus, and on a phone Kakao's level 15, where a campus map's pinch out stops, is closer than
// the lowest zoom of the camera's rules: while a Plan is drawn, a native map may go one level further out.
const ANSWER_MIN_LEVEL = NATIVE_MIN_LEVEL - 1;

const NO_LOOKS: readonly MarkerLook[] = [];

// What the pill covers at the top, under a status bar `top` high, and the card at the bottom, each with room for a
// label.
function paddingOf(top: number, cardHeight: number | null): FitPadding {
  return {
    top: top + listsTop(top) + ANSWER_PILL.height + ROOM_ABOVE,
    right: SIDE,
    bottom: (cardHeight ?? 0) + ROOM_BELOW,
    left: SIDE,
  };
}

// Shows the drawing when it comes, and again when the card's height or the stage's size changes: in one glide to the
// camera `answerCamera` works out for the view. Until the stage is laid out and the map has told its fit zoom, the
// map fits the points itself. No drawing moves nothing, so closing the answer leaves the camera where it is.
function useAnswerCamera(drawing: AnswerDrawing | null, map: MainMap, { answerHeight, stage }: Room): void {
  const { top } = useSafeAreaInsets();
  const { fitAnswer, moveTo, fitZoom } = map;
  const width = stage?.width;
  const height = stage?.height;
  const show = useEffectEvent(() => {
    if (drawing === null || drawing.points.length === 0) {
      return;
    }
    const padding = paddingOf(top, answerHeight);
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
  // A press on a candidate's mark shows its Plan; any other press does nothing.
  onPress: (id: string) => void;
  nativeMinLevel: number;
}

// The Plan on screen drawn on the map in place of the everyday map's markers, lines, the User's own Avatar, and the
// Avatars of the people it draws. Null while no Plan is shown. The looks of every Plan are asked for when the answer
// comes, so that the arrows never wait for a picture.
export function useAnswerMap(
  shown: ShownAnswer,
  map: MainMap,
  room: Room,
  everyday: { avatars: readonly MapAvatar[]; cards: readonly CardView[] },
): AnswerMap | null {
  const { answer, index, show } = shown;
  const drawing = useMemo(() => (answer === null ? null : drawingOf(answer, index)), [answer, index]);
  const looks = useMemo(() => (answer === null ? NO_LOOKS : looksOf(answer)), [answer]);
  const things = drawing?.things ?? [];
  const images = useMarkerImages([...things.map(({ look }) => look), ...looks]);
  useAnswerCamera(drawing, map, room);
  if (drawing === null || things.length === 0) {
    return null;
  }
  const markers = things.flatMap(({ id, name, position, planId, order }, at): MapMarker[] => {
    const image = images[at];
    return image === undefined ? [] : [{ id, name, position, image, order, passive: planId === null }];
  });
  return {
    contents: {
      markers,
      avatars: othersOf(everyday.avatars, everyday.cards, drawing),
      lines: drawing.lines,
    },
    onPress: (id) => {
      const planId = things.find((thing) => thing.id === id)?.planId ?? null;
      if (planId !== null) {
        show(planId);
      }
    },
    nativeMinLevel: ANSWER_MIN_LEVEL,
  };
}
