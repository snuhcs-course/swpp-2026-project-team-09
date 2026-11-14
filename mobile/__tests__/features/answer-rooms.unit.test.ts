/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import { roomsOf } from '@/features/assistant/answer-camera';
import { type AnswerDrawing, drawingOf } from '@/features/assistant/answer-marks';

// The third Plan of the stored answer, with its meeting flag "12:18 민수와 만남" (at 301동) moved to `at`.
function thirdWithFlagAt(at: LatLng): AnswerReply {
  const plan = MEAL_ANSWER.plans[2];
  if (plan === undefined) {
    throw new Error('The stored answer has no third Plan');
  }
  const flags: MapScene['flags'] = plan.scene.flags.map((flag) => (flag.role === 'meeting' ? { ...flag, at } : flag));
  const plans = MEAL_ANSWER.plans.map((one) => (one === plan ? { ...plan, scene: { ...plan.scene, flags } } : one));
  return { ...MEAL_ANSWER, plans };
}

function sideOf({ things }: AnswerDrawing, name: string): string | null {
  const look = things.find((thing) => thing.name === name)?.look;
  return look?.kind === 'answer' ? (look.label?.side ?? null) : null;
}

// 자하연식당 2층, the top-most point of every Plan of the stored answer.
const JAHAYEON = { latitude: 37.46098, longitude: 126.95252 };

// The worked numbers: a mark's symbol box is 36, so 18 on each side of its point; a label above or below adds the gap
// of 2 and its height, 26 for one line and 46 for two; a mark south of the top-most point needs a point less above for
// each 4.5 metres (a degree of latitude is 111,320 metres), and the same north of the bottom-most; at least 24.
// Partitions: labels only at the sides at the top; a two-line label below the bottom-most point; side labels at the
// bottom with a two-line label far north; a flag above the top-most point; a flag above a point 100 metres south.
describe('roomsOf', () => {
  it("keeps 24 above the first Plan's top-most candidate, whose label is at a side, and 66 below its pick", () => {
    // Above: 자하연식당 2층's label is at the left, 18, and no label of the Plan is above its point: at least 24.
    // Below: the pick at 302동 (37.44887) has its two lines below: 18 + 2 + 46 = 66; 민수 there has his at the right.
    expect(roomsOf(drawingOf(MEAL_ANSWER, 0))).toEqual({ above: 24, below: 66 });
  });

  it("keeps 24 below the third Plan's 302동, whose face and candidate have their labels at the sides", () => {
    // Below: 민수 at the right and 302동식당 at the left, 18; the pick 학생회관 has its two lines below, but it stands
    // 0.01045° = 1163.3 metres north: 66 - 258.5 < 24. Above: 자하연식당 2층 at the left, 18; the flag above 301동
    // stands 0.01082° = 1204.5 metres south: 18 + 2 + 26 - 267.7 < 24.
    expect(roomsOf(drawingOf(MEAL_ANSWER, 2))).toEqual({ above: 24, below: 24 });
  });

  it('keeps the room of a flag above the top-most point', () => {
    // Changed from the stored copy: the meeting flag stands at 자하연식당 2층, nothing north of it, so its one line
    // goes above: 18 + 2 + 26 = 46.
    const drawing = drawingOf(thirdWithFlagAt(JAHAYEON), 2);

    expect(sideOf(drawing, '12:18 민수와 만남')).toBe('above');
    expect(roomsOf(drawing).above).toBe(46);
  });

  it.each([
    [100, 24],
    [90, 26],
  ])('keeps, for a flag above a point %d metres south of the top-most one, %d', (south, above) => {
    // Changed from the stored copy: the meeting flag stands that far south of 자하연식당 2층 and about 200 metres east
    // (0.00226° of longitude), out of the reach of its label above: 46 - 100 / 4.5 = 23.8 < 24; 46 - 90 / 4.5 = 26.
    const at = { latitude: JAHAYEON.latitude - south / 111_320, longitude: JAHAYEON.longitude + 0.00226 };
    const drawing = drawingOf(thirdWithFlagAt(at), 2);

    expect(sideOf(drawing, '12:18 민수와 만남')).toBe('above');
    expect(roomsOf(drawing).above).toBeCloseTo(above, 6);
  });
});
