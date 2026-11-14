/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import type { ViewArea } from '@/features/assistant/answer-camera';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type MapCamera, project, unproject } from '@/map';
import { ANSWER_PILL, listsTop } from '@/screens/main/layout';

// The emulator's view while an answer is shown: 411 by 914 points (1080 by 2400 pixels at a density of 2.625), under a
// status bar of 24, the tab bar hidden.
export const SIZE = { width: 411, height: 914 };
export const STATUS_BAR = 24;
// The pill's bottom: the status bar, the lists' top under it, and the pill's height, 24 + 28 + 48 = 100.
export const PILL_BOTTOM = STATUS_BAR + listsTop(STATUS_BAR) + ANSWER_PILL.height;
// The card of the stored answer to "배고파, 민수랑 같이" as measured on the emulator, its top at 508.
export const CARD = 406;
// Ticket 08's area: 8 under the pill and 8 over the card, 16 from each side: from 108 to 500, and from 16 to 395.
export const AREA: ViewArea = {
  top: PILL_BOTTOM + 8,
  right: SIZE.width - 16,
  bottom: SIZE.height - CARD - 8,
  left: 16,
};
// The lowest zoom of a campus map in that view: 914 points over the campus rectangle's 0.026° of latitude.
export const LOWEST = 15.2601;

type Point = { x: number; y: number };

// The camera at `zoom` that shows `at` at the view's point `point`.
export function cameraPutting(at: LatLng, point: Point, zoom = LOWEST): MapCamera {
  const { x, y } = project(at, zoom);
  return { centre: unproject({ x: x - point.x + SIZE.width / 2, y: y - point.y + SIZE.height / 2 }, zoom), zoom };
}

// The position a camera shows at the view's point `point`.
export function positionAt(camera: MapCamera, point: Point): LatLng {
  const centre = project(camera.centre, camera.zoom);
  return unproject({ x: centre.x + point.x - SIZE.width / 2, y: centre.y + point.y - SIZE.height / 2 }, camera.zoom);
}

export function viewAt(camera: MapCamera, area: ViewArea = AREA): LabelView {
  return { camera, size: SIZE, area };
}

// The camera the first Plan of the stored answer is shown at under the emulator's card. Its own points (301동, 302동,
// and 24동) are 370.9 high at the lowest zoom, more than the 302 from 100 + 8 + 24 to 914 − 406 − 8 − 66 = 434 that
// the pill, the card, and the marks' room leave, so its pick's end, 302동 (37.44887) at the south, comes to 434, and
// the middle of the box across (126.95127) to the view's 205.5.
export const FIRST_CAMERA = cameraPutting({ latitude: 37.44887, longitude: 126.95127 }, { x: 205.5, y: 434 });

// The camera of the third Plan, and of the answer for a fixed start: the same own box is more than the 344 from 132
// to 914 − 406 − 8 − 24 = 476, and its pick 학생회관 stands at the north end, so 24동 (37.45942) comes to 132.
export const THIRD_CAMERA = cameraPutting({ latitude: 37.45942, longitude: 126.95127 }, { x: 205.5, y: 132 });

// A stored answer with one change to the scene of its Plan at `planIndex`, made by `change`.
export function withScene(answer: AnswerReply, planIndex: number, change: (scene: MapScene) => MapScene): AnswerReply {
  const plans = answer.plans.map((plan, index) =>
    index === planIndex ? { ...plan, scene: change(plan.scene) } : plan,
  );
  return { ...answer, plans };
}

// A scene with the Place labelled `label` moved to `at`.
export function placeMoved(label: string, at: LatLng): (scene: MapScene) => MapScene {
  return (scene) => ({
    ...scene,
    places: scene.places.map((item) =>
      item.place.label === label ? { ...item, place: { ...item.place, ...at } } : item,
    ),
  });
}
