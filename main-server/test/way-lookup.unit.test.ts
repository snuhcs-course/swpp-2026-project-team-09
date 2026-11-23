/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { onDay } from '../src/assistant/free-time/free-time.js';
import { classAt, id, ME, point, position, readCampus, TUESDAY, wayFor } from './way-example.js';

// Where a Place is, drawn on the map (board q1): "문화관이 어디야?" on Tuesday at 11:50, at 301동 after a Class there,
// on the seed's walking table and shuttle timing.

beforeAll(() => readCampus());

const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

const AT_301 = { latitude: 37.45021, longitude: 126.95262 };

function whereIsCultureHall(): Lookup {
  const answer = wayFor(onDay(TUESDAY, '11:50'), {
    me: {
      userId: ME,
      name: '유상',
      items: [classAt(TUESDAY, '11:00', '11:50', '제1공학관'), classAt(TUESDAY, '13:00', '13:50', '자연과학관6')],
    },
    location: { at: AT_301, placeId: id('제1공학관'), onCampus: true },
    toPlaceId: id('문화관'),
  });
  if (answer.result !== 'found') {
    throw new Error('No way');
  }
  return answer.lookup;
}

describe('Where 문화관 is, from 301동', () => {
  it('is a way, with where the User sets out from as its chip', () => {
    expect(whereIsCultureHall()).toMatchObject({
      kind: 'way',
      chips: [{ kind: 'origin', text: '301동에서', userId: null }],
    });
  });

  it('says where it is, by name and number, and the minutes from where the User is', () => {
    expect(whereIsCultureHall().lines).toEqual([
      [strong('문화관(73동)'), plain('은 여기예요')],
      [plain('지금 있는 301동에서 걸어서 18분')],
    ]);
  });

  it('rests on the walking table, and on the shuttle, which is no faster with the average wait', () => {
    expect(whereIsCultureHall().basis).toEqual([
      '301동 → 문화관(73동) 걸어서 18분 · 앱의 도보표',
      '셔틀은 18분 걸려 걸어요',
    ]);
  });

  it('draws the User where they are, the Place picked out, the way, and a flag with the minutes', () => {
    expect(whereIsCultureHall().scene).toEqual({
      people: [{ userId: ME, name: '유상', me: true, at: AT_301, source: 'exact', tag: '나' }],
      places: [{ place: point('문화관', '문화관(73동)'), role: 'pick', tag: '문화관(73동)' }],
      routes: [{ userId: ME, role: 'me', from: position('제1공학관'), to: position('문화관'), minutes: 18 }],
      flags: [{ at: position('문화관'), text: '문화관(73동) · 걸어서 18분', role: 'place' }],
    });
  });

  it('has no time band, and route guidance to the Place as its action', () => {
    expect(whereIsCultureHall()).toMatchObject({
      band: null,
      actions: [{ kind: 'guide', to: point('문화관', '문화관(73동)') }],
    });
  });
});

// P05 ticket 47: only an hours or a menu answer is a fact; "X 어디야?" keeps 길 안내 as its main button.
it('is no fact, for where a Place is', () => {
  expect(whereIsCultureHall()).not.toHaveProperty('fact');
});
