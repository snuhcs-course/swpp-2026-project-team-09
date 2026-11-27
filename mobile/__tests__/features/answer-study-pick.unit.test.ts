/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { READING_ROOM } from '@/api/mock/data/library';
import { drawingOfScene } from '@/features/assistant/answer-marks';
import { bookingScene, studyLine, studySetting } from '@/features/assistant/booking-scene';
import { seen } from '../support/answer-marks';

// The 관정 booking's pick on the map (P01 ticket 10): the meal pick's make-up in the study colour, its second line what
// is known of the seat and the free seats, and the way there with its own minutes, as a meal Plan's.

const POINT = { placeId: 'p62-1', label: '중앙도서관 관정관', latitude: 37.45903, longitude: 126.95247 };
// The User at 301동, a few minutes' walk away.
const ME = { latitude: 37.4552, longitude: 126.9505 };

function drawn(line: string | null, me: typeof ME | null = null): ReturnType<typeof drawingOfScene> {
  return drawingOfScene(bookingScene(POINT, READING_ROOM, line, me), null, studySetting('22:00'));
}

// Partitions: the seat and the free seats both known, one of them, none, and booked. Expected values: the design's.
describe('the 관정 pick', () => {
  it('is the study round, and its label the room with the start, the seat and the free seats, and ›', () => {
    const pick = seen(drawn(studyLine('7800', 171, false)), 'answer:pick');

    expect(pick.symbol).toMatchObject({ type: 'dot', role: 'pick', number: null, study: true });
    expect(pick.label).toMatchObject({
      tone: 'pick',
      title: '관정 7층 열람실',
      note: '22:00',
      line: '7800번 · 빈 자리 171석',
      action: '›',
      study: true,
    });
    expect(pick.name).toBe('관정 7층 열람실 · 22:00 · 7800번 · 빈 자리 171석');
  });

  it('says what is known of the seat and the free seats, and never an empty value', () => {
    expect(studyLine(null, 171, false)).toBe('빈 자리 171석');
    expect(studyLine('7800', null, false)).toBe('7800번');
    expect(studyLine(null, null, false)).toBeNull();
    expect(studyLine('7800', 171, true)).toBe('7800번 · 예약됨');
    expect(seen(drawn(null), 'answer:pick').label).toMatchObject({
      title: '관정 7층 열람실',
      note: '22:00',
      line: null,
    });
  });
});

// Partitions: the User's position known, and not. Expected values: the meal's policy for the walk.
describe('the way to 관정', () => {
  it("has its minutes on its line while the User's position is known, and the label no walk", () => {
    const drawing = drawn(studyLine('7800', 171, false), ME);

    expect(drawing.things.some(({ id }) => id.startsWith('answer:leg:'))).toBe(true);
    expect(seen(drawing, 'answer:pick').name).not.toMatch(/걸음/u);
  });

  it('has no minutes and no walk on the label without the position', () => {
    const drawing = drawn(studyLine('7800', 171, false));

    expect(drawing.things.some(({ id }) => id.startsWith('answer:leg:'))).toBe(false);
    expect(seen(drawing, 'answer:pick').name).not.toMatch(/걸음/u);
  });
});
