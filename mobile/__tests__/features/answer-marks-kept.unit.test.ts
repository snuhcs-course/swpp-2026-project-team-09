/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, KeptQuest } from '@/api/assistant-types';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { drawingOf, nearOwnMark } from '@/features/assistant/answer-marks';
import { keptDrawingOf, nearKeptWords } from '@/features/assistant/kept-drawing';
import { seen } from '../support/answer-marks';

// P04 ticket 20: the place of a Quest already set marked on the map apart from the candidates. Expected values: the
// stored answer to "배고파" for the User alone, whose candidate 4 is 302동식당, and the tag's words as the ticket gives
// them.

const AT_302: KeptQuest['point'] = {
  placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
  label: '302동식당',
  latitude: 37.44887,
  longitude: 126.95265,
};
const LUNCH: KeptQuest = {
  kind: 'meal-lunch',
  questId: 'q-lunch',
  title: '302동식당에서 점심',
  startAt: '2026-11-17T12:16:00+09:00',
  endAt: null,
  place: '302동식당',
  point: AT_302,
  people: [],
  mine: true,
  changeable: true,
};
// 관정도서관, in no Plan of the stored meet answer.
const MEETING: KeptQuest = {
  ...LUNCH,
  kind: 'meet',
  questId: 'q-meeting',
  title: '민수와 만나기',
  startAt: '2026-11-17T15:00:00+09:00',
  place: '관정도서관',
  point: { placeId: 'kwanjeong', label: '관정도서관', latitude: 37.45965, longitude: 126.95168 },
};

// A point that many degrees of longitude east and of latitude north of the meeting's.
function eastOfMeeting(east: number, north = 0): { latitude: number; longitude: number } {
  return { latitude: 37.45965 + north, longitude: 126.95168 + east };
}

function beside(answer: AnswerReply, planSet: KeptQuest): AnswerReply {
  return { ...answer, planSet };
}

function ids(planSet: KeptQuest): string[] {
  return drawingOf(beside(MEAL_ANSWER_ALONE, planSet), 0).things.map(({ id }) => id);
}

// Partitions: the point at a candidate's place, at a place of its own, none; a lunch, a dinner, a meeting.
describe('the mark of a Quest already set', () => {
  it("stands at candidate 4's place beside the candidate, grey and without a number", () => {
    const drawing = drawingOf(beside(MEAL_ANSWER_ALONE, LUNCH), 0);

    expect(seen(drawing, 'answer:kept')).toMatchObject({
      name: '잡힌 점심 12:16',
      label: { tone: 'kept', title: '잡힌 점심 12:16', line: null, number: null },
      planId: null,
    });
    expect(seen(drawing, 'answer:candidate:302동식당')).toMatchObject({
      name: '후보 4 · 302동식당 · 11:53',
      symbol: { type: 'dot', role: 'candidate', number: 4 },
    });
    expect(seen(drawing, 'answer:kept').symbol).toBeNull();
  });

  it('stands at its own point with its own grey dot, which the camera keeps in view', () => {
    const drawing = drawingOf(beside(MEET_ANSWER, MEETING), 0);

    expect(seen(drawing, 'answer:kept')).toMatchObject({
      name: '잡힌 약속 15:00',
      symbol: { type: 'dot', role: 'kept', number: null },
    });
    expect(drawing.points).toContainEqual({ latitude: 37.45965, longitude: 126.95168 });
  });

  it('says 저녁 for a dinner', () => {
    const dinner = { ...LUNCH, kind: 'meal-dinner', startAt: '2026-11-17T18:30:00+09:00' } as const;

    expect(seen(drawingOf(beside(MEAL_ANSWER_ALONE, dinner), 0), 'answer:kept').name).toBe('잡힌 저녁 18:30');
  });

  it('is not drawn without a point', () => {
    const fromOldServer: KeptQuest = { ...LUNCH };
    delete fromOldServer.point;

    expect(ids({ ...LUNCH, point: null })).not.toContain('answer:kept');
    expect(ids(fromOldServer)).not.toContain('answer:kept');
  });
});

// Partitions: the User's position known, unknown; a point, none. After 그대로 두기 the tag is the only mark beside the
// User's own: the orchestrator's review of the screens, where the camera fits both as it fits a Plan.
describe('the drawing of a Quest left as it is', () => {
  it("is the tag beside the User's own mark, and the camera fits both", () => {
    const drawing = keptDrawingOf(beside(MEAL_ANSWER_ALONE, LUNCH), 0);
    const me = drawing?.things.find(({ id }) => id === 'answer:me');

    expect(drawing?.things.map(({ name }) => name).toSorted()).toEqual(['나', '잡힌 점심 12:16']);
    expect(drawing?.points).toEqual(
      expect.arrayContaining([me?.position, { latitude: 37.44887, longitude: 126.95265 }]),
    );
    expect(drawing?.points).toHaveLength(2);
  });

  it('keeps the camera where it was when the User has no mark', () => {
    const plan = MEAL_ANSWER_ALONE.plans[0];
    const people = plan?.scene.people.filter(({ me }) => !me) ?? [];
    const away = plan === undefined ? [] : [{ ...plan, scene: { ...plan.scene, people } }];
    const drawing = keptDrawingOf({ ...MEAL_ANSWER_ALONE, plans: away, planSet: LUNCH }, 0);

    expect(drawing?.things.map(({ name }) => name)).toEqual(['잡힌 점심 12:16']);
    expect(drawing?.points).toEqual([]);
  });

  it('is none without a point', () => {
    expect(keptDrawingOf(beside(MEAL_ANSWER_ALONE, { ...LUNCH, point: null }), 0)).toBeNull();
  });
});

// Partitions: a Friend's face beside the tag's point; along its label, 250 m to the label's side, level with it and
// 90 m below it, where a face drawn as a pin above its point reaches the words; as far to the other side. The faces of the everyday map give way near the Plan's own marks, so that none lies over a mark's words; the
// tag is one of them, and its label reaches to one side.
describe('the tag among the marks a Friend gives way to', () => {
  // 250 m east or west at the meeting's latitude.
  const EAST_250 = 0.00283;

  it("counts as one of the Plan's own marks", () => {
    const drawing = drawingOf(beside(MEET_ANSWER, MEETING), 0);

    expect(nearOwnMark(drawing, { latitude: 37.45967, longitude: 126.95162 })).toBe(true);
  });

  it("keeps a Friend's face off its label's words, and not off the other side", () => {
    const drawing = drawingOf(beside(MEET_ANSWER, MEETING), 0);
    const side = seen(drawing, 'answer:kept').label?.side;
    const toward = side === 'left' ? -EAST_250 : EAST_250;

    expect(side === 'left' || side === 'right').toBe(true);
    expect(nearKeptWords(drawing, eastOfMeeting(toward))).toBe(true);
    // 90 m south.
    expect(nearKeptWords(drawing, eastOfMeeting(toward, -0.00081))).toBe(true);
    expect(nearKeptWords(drawing, eastOfMeeting(-toward))).toBe(false);
  });
});
