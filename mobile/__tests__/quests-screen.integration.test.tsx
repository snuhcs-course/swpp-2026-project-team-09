/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { mockClient } from '@/api/mock/client';
import { QUESTS } from '@/api/mock/data/quests';
import type { Quest } from '@/api/types';
import { pass, screen, shownAddress } from './support/app';
import { holdBackButton } from './support/back';
import { FULL_SCREEN } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// The Quest list on the whole screen, the `MainQuests` frame, against the mocks.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const CLASS = '강의 · 자료구조 · 301동 118호 · 14:00';
const PARTY = '공개 파티 · AI 커리어 설명회 · 301동 앞 · 17:40';
const DINNER = '비공개 파티 · 김민준 · 저녁 약속 · 학생회관 (63동) · 20:10';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function openQuests(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('button', { name: FULL_SCREEN }));
  await pass(0);
  return user;
}

describe('the Quest list on the whole screen', () => {
  it("opens from the Quest list's button, with every Quest counted, and closes with ✕", async () => {
    const user = await openQuests();

    expect(screen.getByRole('header', { name: '퀘스트 3' })).toBeVisible();
    expect(screen.queryByRole('tab', { name: '지도' })).toBeNull();

    await user.press(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('header', { name: '퀘스트 3' })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
  });

  it("is closed by Android's back button", async () => {
    const pressBack = holdBackButton();
    await openQuests();

    expect(await pressBack()).toBe(true);

    expect(screen.queryByRole('header', { name: '퀘스트 3' })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
  });
});

describe("the Quest list on the whole screen's rows", () => {
  it("lists today's Quests by their start under today's date, each with its kind, place and time", async () => {
    await openQuests();

    expect(screen.getByRole('header', { name: '오늘 · 10월 1일 (목)' })).toBeVisible();
    // A row's label ends with its time.
    const rows = screen.getAllByRole('button', { name: / · \d\d:\d\d$/u });
    expect(rows.map((row) => String(row.props.accessibilityLabel))).toEqual([CLASS, PARTY, DINNER]);
    expect(within(screen.getByRole('button', { name: CLASS })).getByText('14:00')).toBeVisible();
  });

  it('tells 공개 from 비공개 by the icon in each round, in one navy for every Party', async () => {
    await openQuests();

    expect(within(screen.getByRole('button', { name: CLASS })).getByLabelText('강의')).toBeVisible();
    expect(within(screen.getByRole('button', { name: PARTY })).getByLabelText('공개')).toBeVisible();
    expect(within(screen.getByRole('button', { name: DINNER })).getByLabelText('비공개')).toBeVisible();
    for (const [row, kind] of [
      [PARTY, '공개 파티'],
      [DINNER, '비공개 파티 · 김민준'],
    ] as const) {
      expect(within(screen.getByRole('button', { name: row })).getByText(kind)).toHaveStyle({ color: '#0E1330' });
    }
  });

  it('filters by its chips, whose counts stay', async () => {
    const user = await openQuests();
    expect(screen.getByRole('button', { name: '전체 3' })).toBeSelected();

    await user.press(screen.getByRole('button', { name: '강의 1' }));
    expect(screen.getByRole('button', { name: CLASS })).toBeVisible();
    expect(screen.queryByRole('button', { name: PARTY })).toBeNull();

    await user.press(screen.getByRole('button', { name: '파티 2' }));
    expect(screen.queryByRole('button', { name: CLASS })).toBeNull();
    expect(screen.getByRole('button', { name: PARTY })).toBeVisible();
    expect(screen.getByRole('button', { name: DINNER })).toBeVisible();
    expect(screen.getByRole('button', { name: '전체 3' })).not.toBeSelected();
    expect(screen.getByRole('header', { name: '퀘스트 3' })).toBeVisible();
  });
});

describe('a press of a row of the Quest list on the whole screen', () => {
  it("brings the map to a class's place, as the floating list does", async () => {
    const user = await openQuests();

    await user.press(screen.getByRole('button', { name: CLASS }));
    await pass(0);

    expect(screen.queryByRole('header', { name: '퀘스트 3' })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByText('자료구조 · 301동 118호')).toBeVisible();
  });

  it('shows 지도 also when the screen was opened from another tab', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await act(() => {
      router.push('/quests');
    });

    await user.press(screen.getByRole('button', { name: CLASS }));
    await pass(0);

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByText('자료구조 · 301동 118호')).toBeVisible();
  });

  it("opens a Quest's room above it for any other row", async () => {
    const user = await openQuests();

    await user.press(screen.getByRole('button', { name: DINNER }));
    await pass(500);

    expect(shownAddress()).toBe('/room/q-dinner');
    expect(screen.getByRole('header', { name: '저녁 약속' })).toBeVisible();
  });
});

// A 비공개 파티 like 저녁 약속 whose time is not set yet, made after the mock's Quests (P06 ticket 42).
function untimedBoardGame(): Quest {
  const dinner = QUESTS.find(({ id }) => id === 'q-dinner');
  const [step] = dinner?.subQuests ?? [];
  if (dinner === undefined || step === undefined) {
    throw new Error('the mock has no 저녁 약속');
  }
  const place = { placeId: null, label: '녹두', latitude: 37.47045, longitude: 126.93761 };
  return {
    ...dinner,
    id: 'q-board',
    title: '보드게임',
    createdAt: '2026-10-01T03:00:00.000Z',
    subQuests: [{ ...step, id: 'q-board-1', title: '보드게임', startsAt: null, endsAt: null, place }],
  };
}

describe('a Quest whose time is not set', () => {
  beforeEach(() => {
    jest.spyOn(mockClient, 'listQuests').mockResolvedValue([...QUESTS, untimedBoardGame()]);
  });

  it('is counted and listed last, under 시간 미정, with 시간 미정 for its time', async () => {
    await openQuests();

    expect(screen.getByRole('header', { name: '퀘스트 4' })).toBeVisible();
    expect(screen.getByRole('header', { name: '시간 미정' })).toBeVisible();
    const row = screen.getByRole('button', { name: '비공개 파티 · 김민준 · 보드게임 · 녹두 · 시간 미정' });
    expect(within(row).getByText('시간 미정')).toBeVisible();
    const labels = screen.getAllByRole('button', { name: /^(강의|공개 파티|비공개 파티)/u });
    expect(labels.at(-1)?.props.accessibilityLabel).toBe(row.props.accessibilityLabel);
  });

  it("is on the main screen's Quest list and in its count", async () => {
    await openMain();

    expect(screen.getByTestId('quest-count')).toHaveTextContent('4');
    expect(screen.getByText('시간 미정 · 녹두')).toBeOnTheScreen();
  });
});

describe("the Quest list on the whole screen's states", () => {
  it('says so without a Quest', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'listQuests';
    await openQuests();

    expect(screen.getByText('퀘스트가 없어요')).toBeVisible();
    expect(screen.getByRole('header', { name: '퀘스트 0' })).toBeVisible();
  });

  it('shows the shared states while the Quests load and after a failure', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listQuests';
    const user = await openQuests();
    await pass(3000);
    expect(screen.getByText('불러오지 못했어요')).toBeVisible();

    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_MOCK_FAIL');
    await user.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(screen.getByLabelText('불러오는 중')).toBeVisible();
    await pass(1000);
    expect(screen.getByRole('button', { name: CLASS })).toBeVisible();
  });
});
