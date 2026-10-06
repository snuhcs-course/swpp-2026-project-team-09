import { BackHandler } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { CLOSER, DINNER, EVENT, FRIEND, lookOf, MEMBER, PARTY, press, wordsUnder } from './support/markers';
import { startFresh } from './support/mocks';

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// The card's title, its sub-label, its lines and its own button.
const CARDS = [
  [
    'a Friend',
    FRIEND,
    '김민준',
    '컴퓨터공학부',
    ['공강 · 중앙도서관 근처 · 15:00까지 비어 있어요', '도보 4분'],
    '파티 만들기',
  ],
  [
    "a member of the User's Party",
    MEMBER,
    '오현우',
    '산업공학과 · 친구 아님',
    ['활성 파티 멤버 · 위치 공유 중'],
    '파티 열기',
  ],
  [
    'the Global Event',
    EVENT,
    'AI 커리어 설명회',
    '공식 행사 · 컴퓨터공학부 공지',
    ['오늘 18:00–20:00', '301동 대강당', '같이 갈 파티 1개 모집 중'],
    '같이 갈 사람 찾기',
  ],
  ["the User's Party", PARTY, 'AI 커리어 설명회 같이 가요', '파티 · 4/6명', ['17:40 301동 앞에서 출발'], '파티 열기'],
  [
    'the Shared Quest',
    DINNER,
    '저녁 약속',
    '비공개 파티 · 김민준과',
    ['오늘 20:10', '학생회관 (63동)', '활성화에 참여하면 서로 위치가 공유돼요'],
    '길찾기',
  ],
] as const;

describe('a press on a marker of the main screen', () => {
  it.each(CARDS)('opens the card of %s', async (_kind, name, title, subLabel, lines, button) => {
    const user = await openMain();
    expect(screen.queryByTestId('map-card')).toBeNull();

    await press(user, name);

    expect(screen.getByRole('header', { name: title })).toBeVisible();
    expect(screen.getByText(subLabel)).toBeVisible();
    for (const line of lines) {
      expect(screen.getByText(line)).toBeVisible();
    }
    expect(screen.getByRole('button', { name: button })).toBeVisible();
    expect(screen.getByRole('button', { name: CLOSER })).toBeVisible();
    expect(screen.getByRole('button', { name: '닫기' })).toBeVisible();
  });

  it("heads a Friend's card with the Avatar and the status, and a member's with the Avatar alone", async () => {
    const user = await openMain();

    await press(user, FRIEND);
    expect(screen.getByLabelText('김민준 · 공강')).toBeVisible();

    await press(user, MEMBER);
    expect(screen.getByLabelText('오현우')).toBeVisible();
  });

  it('finds no button in the User’s own Avatar: it takes no press and is still read', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();

    expect(screen.queryByRole('button', { name: '내 위치' })).toBeNull();
    expect(screen.getByRole('image', { name: '내 위치' })).toHaveStyle({ pointerEvents: 'none' });
  });
});

describe('an open card', () => {
  it('hides the zoom control, and its X closes it and brings the control back', async () => {
    const user = await openMain();

    await press(user, FRIEND);
    expect(screen.queryByRole('button', { name: '확대' })).toBeNull();
    expect(screen.queryByRole('button', { name: '내 위치로 이동' })).toBeNull();

    await press(user, '닫기');
    expect(screen.queryByTestId('map-card')).toBeNull();
    expect(lookOf(FRIEND)).toBe('person:small:free:f1');
    expect(screen.getByRole('button', { name: '확대' })).toBeVisible();
  });

  it('is replaced by the card of another marker that is pressed', async () => {
    const user = await openMain();

    await press(user, FRIEND);
    await press(user, EVENT);

    expect(screen.queryByRole('header', { name: '김민준' })).toBeNull();
    expect(screen.getByRole('header', { name: 'AI 커리어 설명회' })).toBeVisible();
    expect(screen.getAllByTestId('map-card')).toHaveLength(1);
  });

  it("is closed by Android's back button, which the app takes when a card opens", async () => {
    const listen = jest.spyOn(BackHandler, 'addEventListener');
    const user = await openMain();
    const before = listen.mock.calls.length;

    await press(user, FRIEND);
    expect(listen).toHaveBeenCalledTimes(before + 1);
    const onBack = listen.mock.lastCall?.[1];
    let taken: boolean | null | undefined = false;
    await act(() => {
      taken = onBack?.({ type: 'hardwareBackPress', timeStamp: 0 });
    });

    expect(taken).toBe(true);
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

describe('"가까이 보기"', () => {
  it('brings the map close to the marker, keeps the card and is no longer offered', async () => {
    const user = await openMain();
    await press(user, FRIEND);

    await press(user, CLOSER);

    expect(screen.getByRole('header', { name: '김민준' })).toBeVisible();
    expect(lookOf(FRIEND)).toBe('person:full:free:f1:selected');
    expect(wordsUnder(FRIEND, '민준')).toBeVisible();
    expect(screen.queryByRole('button', { name: CLOSER })).toBeNull();
  });

  it('is offered while places are pins without names, and not once names are shown', async () => {
    const user = await openMain();
    await press(user, '확대');
    await press(user, '확대');
    await press(user, EVENT);
    expect(screen.getByRole('button', { name: CLOSER })).toBeVisible();

    await press(user, '닫기');
    await press(user, '확대');
    await press(user, EVENT);
    expect(screen.queryByRole('button', { name: CLOSER })).toBeNull();
  });
});

describe('a toast while a card is open', () => {
  it('shows above the card, so that it never lies over the buttons', async () => {
    const user = await openMain();
    await press(user, EVENT);
    await fireEvent(screen.getByTestId('map-card'), 'layout', {
      nativeEvent: { layout: { x: 16, y: 300, width: 358, height: 180 } },
    });

    await user.press(screen.getByRole('button', { name: '올리기' }));

    // The navigation's 80, the card's bottom 72 above it, its height, and 8 of clear room.
    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 340 });
    await press(user, '닫기');
    await user.press(screen.getByRole('button', { name: '올리기' }));
    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 158 });
  });
});

describe("a card's button that opens a Quest's room", () => {
  it.each([
    [MEMBER, '파티 열기'],
    [PARTY, '파티 열기'],
  ] as const)("opens the room of the Party's Quest: %s, %s", async (name, button) => {
    const user = await openMain();
    await press(user, name);

    await press(user, button);
    await pass(500);

    expect(shownAddress()).toBe('/room/q-ai');
  });

  it('opens it for "참여하기", on the card of a Party the User is not in', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getMyParty';
    const user = await openMain();
    await press(user, PARTY);

    await press(user, '참여하기');
    await pass(500);

    expect(shownAddress()).toBe('/room/q-ai');
  });
});
