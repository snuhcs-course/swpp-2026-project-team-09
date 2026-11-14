/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LatLng } from '@/api/types';
import { correctedCentre, type ViewArea } from '@/features/assistant/answer-camera';
import { type AnswerDrawing, drawingOf, looksOf } from '@/features/assistant/answer-marks';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { CardView } from '@/features/map/adapter';
import {
  type FitPadding,
  type MapAvatar,
  type MapCamera,
  type MapLine,
  type MapMarker,
  type MarkerLook,
  type Size,
  useMarkerImages,
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
// A fit glides for 300 milliseconds, and the map tells of its rest later than that. A rest told sooner belongs to
// an earlier move, such as the view's change of size when the frame appears, and one told much later to the User.
const FIT_RESTS_AFTER_MS = 500;
const FIT_RESTS_WITHIN_MS = 3000;

const NO_LOOKS: readonly MarkerLook[] = [];
const NO_POINTS: readonly LatLng[] = [];

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

// The area the padding leaves of a view of `size`.
function areaOf({ top, right, bottom, left }: FitPadding, size: Size): ViewArea {
  return { top, right: size.width - right, bottom: size.height - bottom, left };
}

// Fits the points when they come, and again when the card's height or the stage's size changes. No points move
// nothing, so closing the answer leaves the camera where it is. A map may stop short of the fit, held by its lowest
// zoom: where the camera rests after a fit is checked once, and moved so that the Plan shows (`correctedCentre`).
function useAnswerCamera(drawing: AnswerDrawing | null, map: MainMap, { answerHeight, stage }: Room): void {
  const { top } = useSafeAreaInsets();
  const { fitAnswer, centreAt, camera } = map;
  const points = drawing?.points ?? NO_POINTS;
  const width = stage?.width;
  const height = stage?.height;
  // When the last fit was asked, until where it came to rest is checked.
  const fitAt = useRef<number | null>(null);
  const fit = useEffectEvent(() => {
    fitAnswer(points, paddingOf(top, answerHeight));
    fitAt.current = Date.now();
  });
  useEffect(() => {
    if (points.length > 0) {
      fit();
    }
  }, [points, top, answerHeight, width, height]);
  const check = useEffectEvent((now: MapCamera) => {
    const since = fitAt.current === null ? null : Date.now() - fitAt.current;
    if (since === null || since < FIT_RESTS_AFTER_MS || drawing === null || stage === null) {
      return;
    }
    fitAt.current = null;
    if (since > FIT_RESTS_WITHIN_MS) {
      return;
    }
    // The map lies under the status bar too.
    const size = { width: stage.width, height: stage.height + top };
    const centre = correctedCentre(drawing, now, size, areaOf(paddingOf(top, answerHeight), size));
    if (centre !== null) {
      centreAt(centre);
    }
  });
  useEffect(() => {
    if (camera !== null) {
      check(camera);
    }
  }, [camera]);
}

// The Avatars of people the Plan does not draw: Friends and the other people of the User's Party, not the User's own
// nor the shuttle's vehicles.
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
