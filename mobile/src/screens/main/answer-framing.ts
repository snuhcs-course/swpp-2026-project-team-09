/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AnswerReply } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { answerCamera, panToShow } from '@/features/assistant/answer-camera';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOf } from '@/features/assistant/answer-marks';
import type { Standing } from '@/features/assistant/invited-friends';
import { drawsMeal } from '@/features/assistant/meal-marks';
import { NATIVE_MIN_LEVEL, nativeLevelZoom, type Size, ZOOM_OFFSET } from '@/map';
import { labelArea, paddingOf } from './answer-padding';
import type { Room } from './layout';
import type { MainMap } from './use-main-map';

// How an answer is framed on the map: the camera an answer's drawing is shown at, and the area its labels stay in.

// A Plan may span the campus, and on a phone Kakao's level 15, where a campus map's pinch out stops, is closer than
// the lowest zoom of the camera's rules: while a Plan is drawn, a native map may go one level further out.
export const ANSWER_MIN_LEVEL = NATIVE_MIN_LEVEL - 1;
// Where the lowest zoom is too close for the Plan's own points, the camera may go out to that level's zoom
// (`nativeLevelZoom`), kept a quarter of a level clear of it: on Android the module shows a view taller than when it
// opened by sending each zoom that much lower (`useScaleShift` in `native-map.tsx`, 0.146 on the emulator).
export const ANSWER_OUTER_ZOOM = nativeLevelZoom(ANSWER_MIN_LEVEL) + 0.25;

const NO_POINTS: readonly LatLng[] = [];
// The room the map's credit takes above the card ("© OpenStreetMap · 국토지리정보원"), which a meal answer's labels keep
// clear of.
const CREDIT = 24;

// What frames an answer on the map: the status bar, the card, the pill or none, and, once the stage is laid out and
// the map has told its fit zoom, the map's view, under the status bar too, with the closest zoom of its camera.
export interface Framing {
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
export function labelViewOf(
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
  const whole = labelArea(top, card, view.size, pill, timeBar);
  const area = drawing.keep === undefined ? whole : { ...whole, bottom: whole.bottom - CREDIT };
  return camera === null ? null : { camera, size: view.size, area, avoid };
}

// A meal answer's view while another place is chosen (the answer screen's redesign, board E2): the first Plan's,
// kept so that nothing else on the map moves, panned just enough to bring the chosen place into the labels' area.
export function heldView(first: LabelView | null, pick: LatLng | null): LabelView | null {
  return first === null || pick === null ? first : panToShow(first, pick);
}

// The view a meal answer keeps (`heldView`) while it can be chosen from, or null for any other answer.
export function useHeldView(
  answer: AnswerReply | null,
  standings: ReadonlyMap<string, Standing>,
  framing: Framing,
  avoid: readonly LatLng[],
  pick: LatLng | null,
): LabelView | null {
  const first = useMemo(
    () => (answer === null || !drawsMeal(answer) ? null : labelViewOf(drawingOf(answer, 0, standings), framing, avoid)),
    [answer, standings, framing, avoid],
  );
  return useMemo(() => heldView(first, pick), [first, pick]);
}
