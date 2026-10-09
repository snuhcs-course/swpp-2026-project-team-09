// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
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
const PARTY = '공개 파티 · AI 커리어 설명회 같이 가요 · 301동 앞 · 17:40';
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
