/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: no Party, a Party where nobody else shares, and one where others do, the User left out of the count.
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

  it('only the User sees the others → 응답 대기', () => {
    const view = toActiveParty(party([member('me', true), member('min-jun', false)]), 'me');
    expect(view).toEqual({ id: 'party-1', title: 'AI 커리어 설명회 같이 가요', line: '응답 대기' });
  });

  it('three others the User sees and one not → 3명 공유 중', () => {
    const members = ['me', 'a', 'b', 'c'].map((id) => member(id, true));
    expect(toActiveParty(party([...members, member('d', false)]), 'me')?.line).toBe('3명 공유 중');
  });
});
