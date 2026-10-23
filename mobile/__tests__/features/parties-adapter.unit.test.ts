/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: no Party, the members never counted (the User, those the User does not see), and 0, 1 and 2 seen.
// Expected values: P13-01's criteria (iteration 1): `활성 파티` says `{n}명 공유 중` or `응답 대기`.

import type { MyParty } from '@/api/types';
import { toActiveParty } from '@/features/parties/adapter';

function party(members: MyParty['members']): MyParty {
  return {
    id: 'party-1',
    title: 'AI 커리어 설명회 같이 가요',
    capacity: 4,
    joinPolicy: 'open',
    quest: null,
    sharing: true,
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
    expect(toActiveParty(myParty, 'me')).toBeNull();
  });

  it.each([
    ['the User, marked visible', [member('me', true)]],
    ['a member the User does not see', [member('me', false), member('min-jun', false)]],
  ])('%s → not counted, 응답 대기', (_, members) => {
    expect(toActiveParty(party(members), 'me')?.line).toBe('응답 대기');
  });

  it.each([
    [0, '응답 대기'],
    [1, '1명 공유 중'],
    [2, '2명 공유 중'],
  ])('others the User sees: %i → %s', (others, line) => {
    const members = [member('me', false), ...['a', 'b'].slice(0, others).map((id) => member(id, true))];
    expect(toActiveParty(party(members), 'me')?.line).toBe(line);
  });

  it('a Party → its id and title beside the line', () => {
    expect(toActiveParty(party([member('me', false)]), 'me')).toEqual({
      id: 'party-1',
      title: 'AI 커리어 설명회 같이 가요',
      line: '응답 대기',
    });
  });
});
