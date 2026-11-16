/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { startFresh } from '../support/mocks';
import { freshWrapper, settle } from '../support/queries';
import { toActiveParty } from '@/features/parties/adapter';
import { useActiveParty } from '@/features/parties/use-active-party';

// What the controls above the main screen's navigation are told: the adapters' outputs, from the mocks.

let wrapper = freshWrapper();

beforeEach(async () => {
  jest.useFakeTimers();
  wrapper = freshWrapper();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('활성 파티', () => {
  it("counts the members of the User's Party who share their position, the User left out", async () => {
    const { result } = await renderHook(useActiveParty, { wrapper });
    expect(result.current).toBeNull();

    await settle();

    expect(result.current).toEqual({ id: 'm1', title: 'AI 커리어 설명회 같이 가요', line: '3명 공유 중' });
  });

  it('is nothing for a User in no Party', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getMyParty';
    const { result } = await renderHook(useActiveParty, { wrapper });

    await settle();

    expect(result.current).toBeNull();
  });

  it('waits for an answer when nobody else shares', () => {
    const member = { name: '', department: '', leader: false };
    const party = {
      id: 'm1',
      title: '점심',
      capacity: 4,
      joinPolicy: 'closed',
      quest: null,
      sharing: true,
      members: [
        { ...member, id: 'me', visible: true },
        { ...member, id: 'f1', visible: false },
      ],
    } as const;

    expect(toActiveParty({ ...party, members: [...party.members] }, 'me')?.line).toBe('응답 대기');
  });
});
