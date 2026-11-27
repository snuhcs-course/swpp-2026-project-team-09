/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions: no Party; the members never counted (those the User does not see); 0, 1 and 2 seen; the User in or out
// of the count (the Master Switch, and the Party's own sharing). Expected values: P13-01's criteria (iteration 1):
// `활성 파티` says `{n}명 공유 중` or `응답 대기`; the count takes the User in, as the room does (P06 ticket 30).

import type { MyParty } from '@/api/types';
import { toActiveParty } from '@/features/parties/adapter';

function party(members: MyParty['members'], sharing = true): MyParty {
  return {
    id: 'party-1',
    title: 'AI 커리어 설명회 같이 가요',
    capacity: 4,
    joinPolicy: 'open',
    quest: null,
    sharing,
    members,
  };
}

function member(id: string, visible: boolean): MyParty['members'][number] {
  return { id, name: id, department: '경영학과', leader: false, visible };
}

describe('toActiveParty', () => {
  it.each([
    ['null', null],
    ['not known yet', undefined],
  ])('a Party %s → no 활성 파티', (_, myParty) => {
    expect(toActiveParty(myParty, 'me', true)).toBeNull();
  });

  it.each([
    ['the User alone', [member('me', true)]],
    ['a member the User does not see', [member('me', false), member('min-jun', false)]],
  ])('%s → 응답 대기', (_, members) => {
    expect(toActiveParty(party(members), 'me', true)?.line).toBe('응답 대기');
  });

  it.each([
    [0, '응답 대기'],
    [1, '2명 공유 중'],
    [2, '3명 공유 중'],
  ])('others the User sees: %i → %s, the User counted', (others, line) => {
    const members = [member('me', false), ...['a', 'b'].slice(0, others).map((id) => member(id, true))];
    expect(toActiveParty(party(members), 'me', true)?.line).toBe(line);
  });

  it.each([
    ['the Master Switch is off', true, false],
    ['the User does not share in the Party', false, true],
  ])('%s → the User is not counted', (_, sharing, masterOn) => {
    const members = [member('me', true), member('a', true)];
    expect(toActiveParty(party(members, sharing), 'me', masterOn)?.line).toBe('1명 공유 중');
  });

  it('a Party → its id and title beside the line', () => {
    expect(toActiveParty(party([member('me', false)]), 'me', true)).toEqual({
      id: 'party-1',
      title: 'AI 커리어 설명회 같이 가요',
      line: '응답 대기',
    });
  });
});
