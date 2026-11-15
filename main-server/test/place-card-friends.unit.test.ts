/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type CardFact, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { type FriendView } from '../src/friends/dto/friend-view.dto.js';
import { facts, MINSU, minsu, minsuIn302, plain, pressed } from './place-card.js';
import { id, position, readCampus } from './way-example.js';

// 김민수 in 302동 pressed (wireframe row 6, board a14) at each level the Friend view gives, with his Class there until
// 12:15 on Tuesday 2026-11-17: named in the card and drawn only where the asker's map shows him.

beforeAll(() => readCampus());

const at302 = (friend: FriendView, classes: DayItem[] = minsuIn302(), clock = '12:10'): Lookup =>
  pressed('제2공학관', { clock, friends: [{ friend, classes }] });

const userFacts = (lookup: Lookup): CardFact[] => facts(lookup).filter(({ icon }) => icon === 'user');

const MEASURED = '2026-11-17T12:09:00+09:00';

describe('A Friend in the Place pressed', () => {
  it('is named at the exact level in the Place, and drawn where he is', () => {
    const exact = minsu({
      level: 'exact',
      position: { ...position('제2공학관'), measuredAt: MEASURED },
      placeId: id('제2공학관'),
    });

    const lookup = at302(exact);

    expect(userFacts(lookup)).toEqual([plain('user', '김민수가 여기 있어요 · 수업 중 12:15까지', MINSU)]);
    expect(lookup.scene.people).toMatchObject([{ userId: MINSU, source: 'exact', tag: '김민수 · 302동' }]);
  });

  it('is named by his Timetable during his Class in the Place, drawn dashed there', () => {
    const lookup = at302(minsu());

    expect(userFacts(lookup)).toEqual([plain('user', '시간표로는 김민수가 12:15까지 여기서 수업이에요', MINSU)]);
    expect(lookup.scene.people).toMatchObject([{ userId: MINSU, source: 'timetable', at: position('제2공학관') }]);
  });

  it('is named by his Timetable until 15 minutes after his Class there', () => {
    expect(userFacts(at302(minsu(), minsuIn302(), '12:30'))).toEqual([
      plain('user', '김민수는 12:15에 여기서 수업이 끝났어요', MINSU),
    ]);
  });
});

describe('A Friend the map does not show in the Place pressed', () => {
  // The Places are read once the campus is read.
  it.each([
    ['at the Timetable only, after the 15 minutes', (): FriendView => minsu(), '12:31'],
    [
      'at the building he is in, another',
      (): FriendView => minsu({ level: 'building', placeId: id('제1공학관') }),
      '12:10',
    ],
    [
      'at the exact level, near the Place but in none',
      (): FriendView => minsu({ level: 'exact', position: { ...position('제2공학관'), measuredAt: MEASURED } }),
      '12:10',
    ],
  ])('is not named %s, and not drawn', (_, friend, clock) => {
    const lookup = at302(friend(), minsuIn302(), clock);

    expect(userFacts(lookup)).toEqual([]);
    expect(lookup.scene.people).toEqual([]);
  });
});
