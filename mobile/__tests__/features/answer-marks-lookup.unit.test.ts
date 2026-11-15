/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Lookup } from '@/api/lookup-types';
import { FRIEND_LOOKUP } from '@/api/mock/data/friend-lookup';
import { MENU_LOOKUP } from '@/api/mock/data/menu-lookup';
import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { isLookup } from '@/api/server/lookup-answers';
import { color } from '@/design-system';
import { type AnswerDrawing, drawingOfScene } from '@/features/assistant/answer-marks';
import late from '@/api/mock/data/way-lookups/late.json';
import leave from '@/api/mock/data/way-lookups/leave.json';
import shuttle from '@/api/mock/data/way-lookups/shuttle.json';
import { label, MINSU_ID, NEXT_CLASS, seen } from '../support/answer-marks';

function lookupOf(value: unknown): Lookup {
  if (!isLookup(value)) {
    throw new Error('The copy fails the check of a reply');
  }
  return value;
}

function drawingOfCopy(value: unknown): AnswerDrawing {
  return drawingOfScene(lookupOf(value).scene);
}

function ids(drawing: AnswerDrawing): string[] {
  return drawing.things.map(({ id }) => id).toSorted();
}

const ME = label('right', 'person', '나');
const NEXT_58 = 'answer:next:fcd8804e-16f9-5766-b8bc-8c2750b486e2';
const WALK = { color: color.snuBlue, width: 5 };

// Board q1, a walk with no deadline: the User at 301동, 문화관 1.3 km north. Expected values: the copy, the looks agreed
// with package B (P01 ticket 11), and the rule of labels worked by hand: no point lies within a label's reach of
// another. The pick's flag, at the pick, is its label's line without the name the title already says.
describe('the drawing of a way to a Place (q1)', () => {
  const drawing = drawingOfScene(WAY_LOOKUP.scene);

  it('draws the Place as the pick, its flag as the line of its label below it', () => {
    expect(seen(drawing, 'answer:pick')).toEqual({
      name: '문화관(73동) · 걸어서 18분',
      symbol: { type: 'dot', role: 'pick', number: null },
      label: label('below', 'pick', '문화관(73동)', { line: '걸어서 18분' }),
      planId: null,
    });
  });

  it("draws the User's dot with its tag at the right, one walk in the User's colour, and nothing else", () => {
    expect(seen(drawing, 'answer:me')).toMatchObject({ symbol: { type: 'me' }, label: ME });
    expect(drawing.lines.map(({ style }) => style)).toEqual([WALK]);
    expect(ids(drawing)).toEqual(['answer:me', 'answer:pick']);
  });
});

// Board q2: 12:40 at 301동, the 13:00 Class in 24동, which lies 1 km north and 240 m west. Expected values: the copy
// and the rule of labels worked by hand: the flag at the User's point takes the first side of a flag, above.
describe('the drawing of a way with a time to set out (q2)', () => {
  const drawing = drawingOfCopy(leave);

  it('draws "12:45 나서기" above the User\'s dot in the ink tone, with no symbol of its own', () => {
    expect(seen(drawing, 'answer:meeting:0')).toEqual({
      name: '12:45 나서기',
      symbol: null,
      label: label('above', 'leave', '12:45 나서기'),
      planId: null,
    });
    expect(seen(drawing, 'answer:me')).toMatchObject({ symbol: { type: 'me' }, label: ME });
  });

  it('draws the next Class as the next item, with its tag at the left', () => {
    expect(seen(drawing, NEXT_CLASS)).toEqual({
      name: '13:00 수업 · 24동',
      symbol: { type: 'dot', role: 'next', number: null },
      label: label('left', 'next', '13:00 수업 · 24동'),
      planId: null,
    });
    expect(drawing.lines.map(({ style }) => style)).toEqual([WALK]);
  });
});

// Board q3: 12:50, five minutes late for the same Class. Expected values: the copy, and the rule of labels: the flag
// takes the side above the next item, which keeps the left.
describe('the drawing of a way that is late (q3)', () => {
  const drawing = drawingOfCopy(late);

  it('draws "13:05 도착 · 5분 늦어요" above the next Class in the tone of being late', () => {
    expect(seen(drawing, 'answer:meeting:0')).toEqual({
      name: '13:05 도착 · 5분 늦어요',
      symbol: null,
      label: label('above', 'late', '13:05 도착 · 5분 늦어요'),
      planId: null,
    });
    expect(seen(drawing, NEXT_CLASS).label).toEqual(label('left', 'next', '13:00 수업 · 24동'));
  });
});

// Board q4: 16:40, by the shuttle from 301동 정류장 to 경영대 정류장 for the 17:00 Class in 58동. Expected values: the
// copy, the looks agreed with package B, and the rule of labels worked by hand: 301동 정류장 lies 129 m north of the
// User and 8 m west; 경영대 정류장 39 m north of 58동 and 10 m east, so 58동's flag cannot go above and goes below, 58동
// keeps the left, and the stop beside it cannot go left and goes right; the shuttle's flag lies 250 m and more from
// every other point.
describe('the drawing of a way by the shuttle (q4)', () => {
  const drawing = drawingOfCopy(shuttle);

  it('draws each stop as a small dot of the shuttle, its name as the title and the rest of its tag as the line', () => {
    expect(seen(drawing, 'answer:stop:stop 8')).toEqual({
      name: '301동 정류장 · 16:45 셔틀',
      symbol: { type: 'dot', role: 'stop', number: null },
      label: label('left', 'stop', '301동 정류장', { line: '16:45 셔틀' }),
      planId: null,
    });
    expect(seen(drawing, 'answer:stop:stop 14')).toEqual({
      name: '경영대 정류장',
      symbol: { type: 'dot', role: 'stop', number: null },
      label: label('right', 'stop', '경영대 정류장'),
      planId: null,
    });
  });

  it("draws the shuttle's flag above its point in the shuttle's tone", () => {
    expect(seen(drawing, 'answer:meeting:0')).toEqual({
      name: '셔틀 · 신소재공동연구소 지남',
      symbol: null,
      label: label('above', 'shuttle', '셔틀 · 신소재공동연구소 지남'),
      planId: null,
    });
  });

  it('draws 58동 at the left and its arrival flag below it, with the User at the right', () => {
    expect(seen(drawing, NEXT_58).label).toEqual(label('left', 'next', '17:00 수업 · 58동'));
    expect(seen(drawing, 'answer:meeting:1').label).toEqual(label('below', 'pick', '16:53 도착'));
    expect(seen(drawing, 'answer:me').label).toEqual(ME);
  });

  it("draws the walk not taken faded and thin, the walks in the User's colour, and each stretch of the ride", () => {
    const faded = { color: color.inkSubtle, width: 2 };
    const ride = { color: color.svcShuttle, width: 4 };
    expect(drawing.lines.map(({ style }) => style)).toEqual([faded, WALK, ride, ride, ride, ride, ride, ride, WALK]);
  });

  it('keeps the stops in view with the way', () => {
    expect(drawing.own).toEqual(
      expect.arrayContaining([
        { latitude: 37.4513145395911, longitude: 126.952504907509 },
        { latitude: 37.4660256749621, longitude: 126.952148009596 },
      ]),
    );
  });
});

// Board q8: 11:40 in a Class in 301동, its 식당 in the same building. Expected values: the copy, and the rule of
// labels: the User's dot stands at the pick, so the pick's dot is not drawn and its label goes below.
describe('the drawing of a menu (q8)', () => {
  const drawing = drawingOfScene(MENU_LOOKUP.scene);

  it("draws the menu as the line of the pick's label", () => {
    expect(seen(drawing, 'answer:pick')).toEqual({
      name: '301동식당 · 부대짬뽕&군만두 · (뚝)순댓국&계란장조림',
      symbol: null,
      label: label('below', 'pick', '301동식당', { line: '부대짬뽕&군만두 · (뚝)순댓국&계란장조림' }),
      planId: null,
    });
  });

  it('draws the User at the right of the same point, and the way on to the next Class', () => {
    expect(seen(drawing, 'answer:me')).toMatchObject({ symbol: { type: 'me' }, label: ME });
    expect(seen(drawing, NEXT_CLASS).label).toEqual(label('left', 'next', '13:00 수업 · 24동'));
    expect(drawing.lines.map(({ style }) => style)).toEqual([{ color: color.borderStrong, width: 3 }]);
  });
});

// Board q6: 민수 in his Class in 302동, shown at the building he is in. Expected values: the copy, and B's rule that a
// face's label leaves out a name of two characters.
describe('the drawing of where a Friend is (q6)', () => {
  const drawing = drawingOfScene(FRIEND_LOOKUP.scene);

  it('draws 민수 as a face with a plain border at 302동, with the rest of his tag at the right', () => {
    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toEqual({
      name: '민수 · 지금 302동',
      symbol: { type: 'face', name: '민수', dashed: false },
      label: label('right', 'person', '지금 302동'),
      planId: null,
    });
    expect(drawing.lines).toEqual([]);
    expect(drawing.userIds).toEqual([MINSU_ID]);
  });
});

// Partitions: a scene with a pick, ways without one to a next Class on foot and by the shuttle, and a scene with
// neither. Expected values: the copies, and design section 4, "the map shows the destination's side": a way's
// destination is its next item.
describe('the destination the camera keeps on its side', () => {
  it.each([
    ['q1, the pick 문화관', WAY_LOOKUP, { latitude: 37.46159, longitude: 126.95104 }],
    ['q2, 24동 without a pick', lookupOf(leave), { latitude: 37.45942, longitude: 126.94989 }],
    ['q4, 58동 by the shuttle', lookupOf(shuttle), { latitude: 37.46568, longitude: 126.95203 }],
  ])('is %s', (_, lookup, destination) => {
    expect(drawingOfScene(lookup.scene).pick).toEqual(destination);
  });

  it('is none for 민수, a person alone (q6)', () => {
    expect(drawingOfScene(FRIEND_LOOKUP.scene).pick).toBeNull();
  });
});
