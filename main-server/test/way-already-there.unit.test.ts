/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type WayArgs } from '../src/assistant/lookup/way.js';
import { classAt, id, ME, point, position, readCampus, TUESDAY, wayFor } from './way-example.js';

// A way asked where the User already is, on Tuesday on the seed's Places: at 24동 at 12:40 before the 13:00 Class
// there (board q2's Class), and at 문화관 at 11:50 asking where it is (board q1's question).

beforeAll(() => readCampus());

const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

const tuesday = (): DayItem[] => [
  classAt(TUESDAY, '11:00', '11:50', '제1공학관'),
  classAt(TUESDAY, '13:00', '13:50', '자연과학관6'),
];

function lookupAt(clock: string, placeName: string, given: Partial<Omit<WayArgs, 'now' | 'placeOf'>> = {}): Lookup {
  const answer = wayFor(onDay(TUESDAY, clock), {
    me: { userId: ME, name: '유상', items: tuesday() },
    location: { at: position(placeName), placeId: id(placeName), onCampus: true },
    ...given,
  });
  if (answer.result !== 'found') {
    throw new Error(`No way: ${answer.reason}`);
  }
  return answer.lookup;
}

const me = (placeName: string): Lookup['scene']['people'][number] => ({
  userId: ME,
  name: '유상',
  me: true,
  at: position(placeName),
  source: 'exact',
  tag: '나',
});

describe('At the Place of the next Class', () => {
  it('says the User is there, and the minutes left until the Class', () => {
    expect(lookupAt('12:40', '자연과학관6').lines).toEqual([
      [plain('지금 '), strong('24동'), plain('에 있어요')],
      [plain('13:00 수업까지 20분 남았어요')],
    ]);
  });

  it('rests on where the User is and the time now', () => {
    expect(lookupAt('12:40', '자연과학관6').basis).toEqual([
      '지금 있는 곳이 24동이에요',
      '지금 12:40 · 13:00 수업까지 20분',
    ]);
  });

  it('draws the User and the Place, with no way, no flag, no band, and no buttons', () => {
    expect(lookupAt('12:40', '자연과학관6')).toMatchObject({
      scene: {
        people: [me('자연과학관6')],
        places: [{ place: point('자연과학관6', '24동'), role: 'next', tag: '13:00 수업 · 24동' }],
        routes: [],
        flags: [],
      },
      band: null,
      actions: [],
    });
  });

  it('counts the minutes left until a time the User named', () => {
    expect(lookupAt('12:40', '자연과학관6', { by: '13:00' }).lines[1]).toEqual([plain('13:00까지 20분 남았어요')]);
  });
});

describe('At a Place asked about, with no deadline', () => {
  it('says the Place is here, and that the User is in it', () => {
    expect(lookupAt('11:50', '문화관', { toPlaceId: id('문화관') }).lines).toEqual([
      [strong('문화관(73동)'), plain('은 여기예요')],
      [plain('지금 문화관(73동)에 있어요')],
    ]);
  });

  it('rests on where the User is, and draws the User and the Place alone', () => {
    expect(lookupAt('11:50', '문화관', { toPlaceId: id('문화관') })).toMatchObject({
      basis: ['지금 있는 곳이 문화관(73동)이에요'],
      scene: {
        people: [me('문화관')],
        places: [{ place: point('문화관', '문화관(73동)'), role: 'pick', tag: '문화관(73동)' }],
        routes: [],
        flags: [],
      },
      band: null,
      actions: [],
    });
  });
});
