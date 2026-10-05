import { renderHook } from '@testing-library/react-native';
import { startFresh } from '../support/mocks';
import { freshWrapper, settle } from '../support/queries';
import { useFootprints } from '@/features/footprints/use-footprints';
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

describe('오늘의 발자국', () => {
  it('has nothing beside its name while it loads, and then three faces and the number of Friends', async () => {
    const { result } = await renderHook(useFootprints, { wrapper });
    expect(result.current).toEqual({ faces: [], line: '' });

    await settle();

    expect(result.current.line).toBe('친구 5명의 오늘');
    expect(result.current.faces.map(({ name }) => name)).toEqual(['김민준', '이서연', '박지호']);
  });

  it.each(['MOCK_FAIL', 'MOCK_EMPTY'] as const)('has its name alone with EXPO_PUBLIC_%s', async (setting) => {
    process.env[`EXPO_PUBLIC_${setting}`] = 'getFootprints';
    const { result } = await renderHook(useFootprints, { wrapper });

    await settle();

    expect(result.current).toEqual({ faces: [], line: '' });
  });
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
      mark: null,
      sharing: true,
      members: [
        { ...member, id: 'me', visible: true },
        { ...member, id: 'f1', visible: false },
      ],
    } as const;

    expect(toActiveParty({ ...party, members: [...party.members] }, 'me')?.line).toBe('응답 대기');
  });
});
