import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { startFresh } from '../support/mocks';
import { useFriends } from '@/features/friends/use-friends';
import { useMapCards } from '@/features/map/use-map-cards';
import { useWalkingRoute } from '@/features/map/use-walking-route';
import { useQuestRows } from '@/features/quests/use-quest-rows';

// What a screen is told when it asks for data: the adapters' outputs, through TanStack Query, from the mocks.

// One client for a test. A failure is told at once, without the second try of the app's own client.
let client = new QueryClient();

function wrapper({ children }: { children: ReactNode }): ReactElement {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function settle(): Promise<void> {
  await act(async () => {
    await jest.runAllTimersAsync();
  });
}

beforeEach(async () => {
  jest.useFakeTimers();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the friend list', () => {
  it('is loading, and then has a row for every Friend', async () => {
    const { result } = await renderHook(useFriends, { wrapper });
    expect(result.current.isPending).toBe(true);

    await settle();

    expect(result.current.data).toHaveLength(12);
    expect(result.current.data?.find(({ name }) => name === '김민준')).toEqual({
      id: 'f1',
      name: '김민준',
      department: '컴퓨터공학부',
      presence: 'free',
      line: '공강 · 중앙도서관',
      detail: '공강 · 중앙도서관 근처 · 15:00까지 비어 있어요',
      walk: '도보 4분',
      photo: null,
      position: { latitude: 37.45952, longitude: 126.95209 },
    });
  });

  it('shows a Friend whose location is off without a place and without a position', async () => {
    const { result } = await renderHook(useFriends, { wrapper });
    await settle();

    expect(result.current.data?.find(({ name }) => name === '서지우')).toMatchObject({
      presence: 'off',
      line: '위치 꺼짐',
      position: null,
    });
  });
});

describe('the friend list without an answer', () => {
  it('is told of a failure', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listPositions';
    const { result } = await renderHook(useFriends, { wrapper });

    await settle();

    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('is empty for a User without Friends', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'listFriends';
    const { result } = await renderHook(useFriends, { wrapper });

    await settle();

    expect(result.current.data).toEqual([]);
  });
});

describe('the Quest list', () => {
  it("has today's class and the User's Parties, the earliest first, worded as the frame", async () => {
    const { result } = await renderHook(useQuestRows, { wrapper });

    await settle();

    expect(result.current.data).toEqual([
      {
        id: 'c1',
        kind: 'class',
        joinPolicy: null,
        kicker: '다음 강의 · 23분 후',
        title: '자료구조',
        meta: '14:00 · 301동 118호',
        position: { latitude: 37.45016, longitude: 126.95259 },
      },
      {
        id: 'q-ai',
        kind: 'party',
        joinPolicy: 'open',
        kicker: '공개 파티 · 활성화 중',
        title: 'AI 커리어 설명회 같이 가요',
        meta: '17:40 · 301동 앞',
        position: { latitude: 37.45091, longitude: 126.95289 },
      },
      {
        id: 'q-dinner',
        kind: 'party',
        joinPolicy: null,
        kicker: '비공개 파티 · 김민준',
        title: '저녁 약속',
        meta: '20:10 · 학생회관 (63동)',
        position: { latitude: 37.45907, longitude: 126.95023 },
      },
    ]);
  });

  it('words a Party the User is not active in by its members', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getMyParty';
    const { result } = await renderHook(useQuestRows, { wrapper });

    await settle();

    expect(result.current.data?.find(({ id }) => id === 'q-ai')).toMatchObject({ kicker: '공개 파티 · 4명' });
  });
});

describe('the cards of the map', () => {
  it('has a card for the Global Event, each Party, each Friend on the map and the other member of the Party, in that order', async () => {
    const { result } = await renderHook(useMapCards, { wrapper });

    await settle();

    const cards = result.current.data ?? [];
    expect(cards.map(({ kind }) => kind)).toEqual([
      'global-event',
      'party',
      'party',
      ...Array.from({ length: 10 }, () => 'friend'),
      'party-member',
    ]);
    expect(cards.find(({ id }) => id === 'event:e1')).toEqual({
      id: 'event:e1',
      kind: 'global-event',
      subLabel: '공식 행사 · 컴퓨터공학부 공지',
      title: 'AI 커리어 설명회',
      lines: [
        { icon: 'clock', text: '오늘 18:00–20:00' },
        { icon: 'pin', text: '301동 대강당' },
        { icon: 'users', text: '같이 갈 파티 1개 모집 중' },
      ],
      primary: { label: '같이 갈 사람 찾기', action: 'not-ready' },
      secondary: null,
      position: { latitude: 37.45016, longitude: 126.95259 },
    });
  });
});

describe('the cards of people and Parties', () => {
  it("words a Party, a Friend and a Party's member as the frame's cards", async () => {
    const { result } = await renderHook(useMapCards, { wrapper });

    await settle();

    const cards = result.current.data ?? [];
    expect(cards.find(({ id }) => id === 'party:q-ai')).toMatchObject({
      subLabel: '파티 · 4/6명',
      title: 'AI 커리어 설명회 같이 가요',
      lines: [{ icon: 'clock', text: '17:40 301동 앞에서 출발' }],
      primary: { label: '파티 열기', action: 'not-ready' },
    });
    expect(cards.find(({ id }) => id === 'party:q-dinner')).toMatchObject({
      subLabel: '비공개 파티 · 김민준과',
      title: '저녁 약속',
      lines: [
        { icon: 'clock', text: '오늘 20:10' },
        { icon: 'pin', text: '학생회관 (63동)' },
      ],
      primary: { label: '길찾기', action: 'route' },
    });
    expect(cards.find(({ id }) => id === 'friend:f1')).toMatchObject({
      subLabel: '컴퓨터공학부',
      title: '김민준',
      lines: [
        { icon: 'info', text: '공강 · 중앙도서관 근처 · 15:00까지 비어 있어요' },
        { icon: 'route', text: '도보 4분' },
      ],
      primary: { label: '파티 만들기', action: 'not-ready' },
    });
    expect(cards.find(({ id }) => id === 'party-member:pm1')).toMatchObject({
      subLabel: '산업공학과 · 친구 아님',
      title: '오현우',
      lines: [{ icon: 'info', text: '활성 파티 멤버 · 위치 공유 중' }],
      position: { latitude: 37.45519, longitude: 126.95325 },
    });
  });
});

describe('the Quest list and the cards for Quests that no Party names', () => {
  it('words a Quest shared with a Friend as the frame does, and one held alone as a Quest', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getMyParty,listParties';
    const rows = await renderHook(useQuestRows, { wrapper });
    const cards = await renderHook(useMapCards, { wrapper });

    await settle();

    expect(rows.result.current.data?.find(({ id }) => id === 'q-dinner')).toMatchObject({
      kind: 'party',
      joinPolicy: null,
      kicker: '비공개 파티 · 김민준',
    });
    expect(rows.result.current.data?.find(({ id }) => id === 'q-ai')).toMatchObject({
      joinPolicy: null,
      kicker: '비공개 파티 · 김민준, 오현우, 정하은',
    });
    expect(cards.result.current.data?.find(({ id }) => id === 'party:q-ai')).toMatchObject({
      subLabel: '비공개 파티 · 김민준, 오현우, 정하은과',
      primary: { label: '길찾기', action: 'route' },
    });
  });

  it('tells the map of a failure of any of its answers', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listGlobalEvents';
    const { result } = await renderHook(useMapCards, { wrapper });

    await settle();

    expect(result.current.isError).toBe(true);
  });
});

describe('the walking route', () => {
  it('asks nothing until it has both ends', async () => {
    const to = { latitude: 37.45907, longitude: 126.95023 };
    const { result, rerender } = await renderHook(
      ({ from }: { from: { latitude: number; longitude: number } | null }) => useWalkingRoute(from, to),
      { wrapper, initialProps: { from: null } },
    );
    await settle();
    expect(result.current.fetchStatus).toBe('idle');

    await rerender({ from: { latitude: 37.45905, longitude: 126.9512 } });
    await settle();

    expect(result.current.data?.status).toBe('OK');
  });
});
