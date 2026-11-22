/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import type { LabelSide } from '@/design-system';
import { placeLabels, type Words } from '@/features/assistant/answer-labels';
import { drawingOf } from '@/features/assistant/answer-marks';
import { NO_STANDINGS } from '@/features/assistant/invited-friends';
import { inView } from '@/map';
import { MINSU_ID, NEXT_CLASS, seen } from '../support/answer-marks';
import {
  AREA,
  cameraPutting,
  placeMoved,
  positionAt,
  SIZE,
  THIRD_AT_LOWEST,
  viewAt,
  withScene,
} from '../support/answer-view';

// The third Plan under a card of 274 on a phone without a status bar: the pill ends at 0 + 52 + 48 = 100, so the area
// runs from 108 to 914 − 274 − 8 = 632. All the points, 425.7 high at the lowest zoom, fit the 476 from 132 to
// 914 − 274 − 8 − 24 = 608, so the camera comes closer, to 15.2601 + log2(476 / 425.7) = 15.4212, with 자하연식당 2층
// (37.46098) at 132 and the middle of the points across (126.95058) at 205.5. There 301동 stands at (268.2, 557.3) and
// 302동 at (270.1, 608.0): 50.7 apart up and down and 1.9 across.
const CLOSER = cameraPutting({ latitude: 37.46098, longitude: 126.95058 }, { x: 205.5, y: 132 }, 15.4212);
const UNDER_274 = { ...AREA, bottom: SIZE.height - 274 - 8 };

// Partitions: two labels at the left and two at the right of neighbouring marks, the one nearer its mark moving.
describe('labels at one side of neighbouring marks', () => {
  const drawing = drawingOf(MEAL_ANSWER, 2, NO_STANDINGS, viewAt(CLOSER, UNDER_274));

  it('end the labels of 301동식당 and 302동식당 on one right edge: 302동식당 moves 2 away from its mark', () => {
    // Their right edges, 20 left of their points, are 248.2 and 250.1; the furthest out is 248.2.
    expect(seen(drawing, 'answer:candidate:301동식당').label).toMatchObject({ side: 'left' });
    expect(seen(drawing, 'answer:candidate:301동식당').label).not.toHaveProperty('shift');
    expect(seen(drawing, 'answer:candidate:302동식당').label).toMatchObject({ side: 'left', shift: 2 });
  });

  it("start the User's and 민수's tags on one left edge: the User's moves 2 away from its mark", () => {
    // Their left edges are 288.2 and 290.1; the furthest out is 290.1.
    expect(seen(drawing, 'answer:me').label).toMatchObject({ side: 'right', shift: 2 });
    expect(seen(drawing, `answer:person:${MINSU_ID}`).label).not.toHaveProperty('shift');
  });
});

// The third Plan at the lowest zoom on the emulator: 3식당 stands at (128.5, 235.7). A view moved so that 3식당 stands
// further right gives "3식당 12:31" with its number, 105 wide, room at its left: its right edge 20 left of its point.
// A Place moved to a point of the view this far from it takes its left side too.
const AT_3 = inView({ latitude: 37.45647, longitude: 126.94851 }, THIRD_AT_LOWEST, SIZE);
// 60 further: 3식당 at (188.5, 235.7), room at its left for "자하연식당 2층 12:35" with its number, 150 wide.
const ROOMIER = cameraPutting({ latitude: 37.45647, longitude: 126.94851 }, { x: AT_3.x + 60, y: AT_3.y });
// 20 further: 3식당 at (148.5, 235.7), its label from 23.5 to 128.5.
const NEAR_EDGE = cameraPutting({ latitude: 37.45647, longitude: 126.94851 }, { x: AT_3.x + 20, y: AT_3.y });

function drawnWith(label: string, across: number, down: number, camera = ROOMIER): ReturnType<typeof drawingOf> {
  // Changed from the stored copy: the Place stands that far right of and below 3식당 in the view.
  const three = inView({ latitude: 37.45647, longitude: 126.94851 }, camera, SIZE);
  const at = positionAt(camera, { x: three.x + across, y: three.y + down });
  return drawingOf(withScene(MEAL_ANSWER, 2, placeMoved(label, at)), 2, NO_STANDINGS, viewAt(camera));
}

// Partitions: marks 59.5 points apart up and down (in) and 60.5 (out); 20 apart across (in) and 36.5 (out), 40 below
// so that its label at the left stays clear of 3식당's dot; a move that the area's left edge cuts short.
describe('the bounds of neighbouring marks', () => {
  it("moves the label of 자하연식당 2층, 59.5 below and 20 right of 3식당, 20 away to 3식당's right edge", () => {
    // Its right edge would be at 188.5; moved to 168.5, its 150 run from 18.5, inside 16.
    expect(seen(drawnWith('자하연식당 2층', 20, 59.5), 'answer:candidate:자하연식당 2층').label).toMatchObject({
      side: 'left',
      shift: 20,
    });
  });

  it.each([
    ['60.5 below', 20, 60.5],
    ['36.5 to the right', 36.5, 40],
  ])('leaves the label of 자하연식당 2층 %s 3식당 where it is', (_, across, down) => {
    const { label } = seen(drawnWith('자하연식당 2층', across, down), 'answer:candidate:자하연식당 2층');

    expect(label).toMatchObject({ side: 'left' });
    expect(label).not.toHaveProperty('shift');
  });

  it('moves a label only as far as the left edge of the area lets it', () => {
    // The next Class 24동, 40 below and 30 right of 3식당, at (178.5, 275.7): "13:00 수업 · 24동", 113 wide, runs
    // from 45.5 to 158.5. To end on 128.5 it would start at 15.5, so it moves 45.5 − 16 = 29.5, in whole points 29.
    expect(seen(drawnWith('24동', 30, 40, NEAR_EDGE), NEXT_CLASS).label).toMatchObject({ side: 'left', shift: 29 });
  });
});

// Partitions: no view, as before the camera is known.
describe('labels drawn without a view', () => {
  it('move no label', () => {
    expect(seen(drawingOf(MEAL_ANSWER, 2), 'answer:candidate:302동식당').label).not.toHaveProperty('shift');
  });
});

function seenAt(x: number, y: number): LatLng {
  return positionAt(THIRD_AT_LOWEST, { x, y });
}

function words(title: string): Words {
  return { tone: 'candidate', title, line: null, number: null };
}

// The marks of the bounds above placed one by one: 3식당 and 자하연식당 2층 59.5 below and 20 right of it, whose label
// would move 20 to share 3식당's right edge, from 37.5 to 17.5; and a symbol without a label, 36 square, at (10, 295.2).
function placedWith(symbolAt: number | null): ReturnType<typeof placeLabels> {
  const sides = ['left', 'right', 'below', 'above'] as const;
  const three = seenAt(AT_3.x, AT_3.y);
  const jahayeon = seenAt(AT_3.x + 20, AT_3.y + 59.5);
  const lone = symbolAt === null ? [] : [seenAt(symbolAt, AT_3.y + 59.5)];
  const points = [three, jahayeon, ...lone].map((position) => ({ position, symbol: position }));
  const marks = [
    { point: 0, position: three, words: words('3식당'), sides },
    { point: 1, position: jahayeon, words: words('자하연식당 2층'), sides },
    ...lone.map((position) => ({ point: 2, position, words: null, sides })),
  ];
  return placeLabels(points, marks, viewAt(THIRD_AT_LOWEST));
}

// Partitions: a move with nothing in its way; a move onto another point's symbol box.
describe('a label moving to share an edge', () => {
  it('moves when nothing is in its way', () => {
    expect(placedWith(null)[1]).toMatchObject({ side: 'left', shift: 20 });
  });

  it("stays where it is when the move would cover another point's symbol, from -8 to 28", () => {
    const [, moved] = placedWith(10);

    expect(moved).toMatchObject({ side: 'left' });
    expect(moved).not.toHaveProperty('shift');
  });
});

// "3식당" labels, 45 by 26, at points of the view, each with the one side or the sides given, in that order.
function threes(
  marks: readonly { at: readonly [number, number]; sides: readonly LabelSide[] }[],
): ReturnType<typeof placeLabels> {
  const placed = marks.map(({ at: [x, y], sides }, point) => ({
    point,
    position: seenAt(x, y),
    words: words('3식당'),
    sides,
  }));
  return placeLabels(
    placed.map(({ position }) => ({ position, symbol: position })),
    placed,
    viewAt(THIRD_AT_LOWEST),
  );
}

// Labels at the right of the point (100, 300), from 120 to 165 and 287 to 313, and of its neighbour (110, 260), from
// 130 to 175 and 247 to 273: the first moves 10 to start on 130, from 130 to 175. Symbol boxes are 36 square on their
// points.
const SHARING_RIGHT = [
  { at: [100, 300], sides: ['right'] },
  { at: [110, 260], sides: ['right'] },
] as const;

// Partitions: a side covering only a label placed before it; a move onto a label that stays; two moves towards each
// other across a gap of 10, each clear of the other's label where it stood.
describe('labels placed one by one at points of a view', () => {
  it('takes the next side when the first covers only a label placed before it', () => {
    // At (190, 300) the left side, 125 to 170, covers the label at the right of (100, 300), 120 to 165, and neither
    // a symbol (82 to 118) nor the area's edge; the right, 210 to 255, covers nothing.
    const [, next] = threes([
      { at: [100, 300], sides: ['right'] },
      { at: [190, 300], sides: ['left', 'right'] },
    ]);

    expect(next).toMatchObject({ side: 'right' });
  });

  it('stays where it is when the move would cover a label that stays, from 170 to 215', () => {
    // The label at the left of (235, 300), 170 to 215, has no neighbour; the move to 130 to 175 would cover it, and
    // no symbol (217 to 253).
    const [moving] = threes([...SHARING_RIGHT, { at: [235, 300], sides: ['left'] }]);

    expect(moving).toMatchObject({ side: 'right' });
    expect(moving).not.toHaveProperty('shift');
  });

  it('moves only the first of two labels that would move towards each other into one place', () => {
    // At the left of (240, 300), 175 to 220, and of its neighbour (230, 340), 165 to 210 and 327 to 353, the first
    // moves 10 to end on 210, from 165 to 210. Each move alone clears the other label where it stood (130 to 175
    // against 175 to 220, and 165 to 210 against 120 to 165), but both would cover each other from 165 to 175.
    const [right, , left] = threes([
      ...SHARING_RIGHT,
      { at: [240, 300], sides: ['left'] },
      { at: [230, 340], sides: ['left'] },
    ]);

    expect(right).toMatchObject({ side: 'right', shift: 10 });
    expect(left).toMatchObject({ side: 'left' });
    expect(left).not.toHaveProperty('shift');
  });
});

// Two points 10 apart across: the first label takes the left of (200, 300), from 135 to 180; the second, at
// (210, 300) with only its left, would cover it, and its other sides are not in its list.
function crowded(number: number | null): ReturnType<typeof placeLabels> {
  const first = seenAt(200, 300);
  const second = seenAt(210, 300);
  return placeLabels(
    [first, second].map((position) => ({ position, symbol: position })),
    [
      { point: 0, position: first, words: words('3식당'), sides: ['left'] },
      {
        point: 1,
        position: second,
        words: { ...words('자하연식당 2층'), number },
        sides: ['left'],
        kept: true,
        shrinks: true,
      },
    ],
    viewAt(THIRD_AT_LOWEST),
  );
}

// Partitions: a tag that gives way with its number, and one with none, as a receded candidate's (PR 515's review).
describe('a held tag with no side free', () => {
  it('keeps its number only', () => {
    expect(crowded(5)[1]).toMatchObject({ title: '', number: 5 });
  });

  it('keeps its words when it has no number to keep', () => {
    expect(crowded(null)[1]).toMatchObject({ title: '자하연식당 2층', number: null });
  });
});
