/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LatLng } from '@/api/types';
import { drawingOf, looksOf } from '@/features/assistant/answer-marks';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { CardView } from '@/features/map/adapter';
import { type FitPadding, type MapAvatar, type MapLine, type MapMarker, type MarkerLook, useMarkerImages } from '@/map';
import { PILL_HEIGHT } from './answer/answer-frame';
import { listsTop, type Room } from './layout';
import type { MainMap } from './use-main-map';

// What the map draws: its markers, its Avatars, and its lines.
export interface MapContents {
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
  lines: readonly MapLine[];
}

// Room for a label above or below a point: half the symbol box and a label of two lines.
const LABEL_ROOM = 56;
const SIDE = 64;

const NO_LOOKS: readonly MarkerLook[] = [];
const NO_POINTS: readonly LatLng[] = [];

// What the pill covers at the top, under a status bar `top` high, and the card at the bottom, each with room for a
// label.
function paddingOf(top: number, cardHeight: number | null): FitPadding {
  return {
    top: top + listsTop(top) + PILL_HEIGHT + LABEL_ROOM,
    right: SIDE,
    bottom: (cardHeight ?? 0) + LABEL_ROOM,
    left: SIDE,
  };
}

// Fits the points when they come, and again when the card's height or the stage's size changes. No points move
// nothing, so closing the answer leaves the camera where it is.
function useAnswerFit(points: readonly LatLng[], map: MainMap, { answerHeight, stage }: Room): void {
  const { top } = useSafeAreaInsets();
  const { fitAnswer } = map;
  const width = stage?.width;
  const height = stage?.height;
  useEffect(() => {
    if (points.length > 0) {
      fitAnswer(points, paddingOf(top, answerHeight));
    }
  }, [points, fitAnswer, top, answerHeight, width, height]);
}

// The Avatars of people the Plan does not draw: Friends and members, not the User's own nor the shuttle's vehicles.
function othersOf(avatars: readonly MapAvatar[], cards: readonly CardView[], userIds: readonly string[]): MapAvatar[] {
  const others = new Set(
    cards.flatMap(({ id, mark }) => (mark.type === 'person' && !userIds.includes(mark.id) ? [id] : [])),
  );
  return avatars.filter(({ id }) => others.has(id));
}

export interface AnswerMap {
  contents: MapContents;
  // A press on a candidate's mark shows its Plan; any other press does nothing.
  onPress: (id: string) => void;
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
  useAnswerFit(drawing?.points ?? NO_POINTS, map, room);
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
      avatars: othersOf(everyday.avatars, everyday.cards, drawing.userIds),
      lines: drawing.lines,
    },
    onPress: (id) => {
      const planId = things.find((thing) => thing.id === id)?.planId ?? null;
      if (planId !== null) {
        show(planId);
      }
    },
  };
}
