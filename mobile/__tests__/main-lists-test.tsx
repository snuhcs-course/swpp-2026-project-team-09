import { Animated } from 'react-native';
import { pass, screen } from './support/app';
import {
  boxOf,
  button,
  CLASS_ROW,
  DINNER_ROW,
  findButton,
  FOLD_FRIENDS,
  FOLD_QUESTS,
  FRIEND_ROW,
  FRIEND_ROW_OFF,
  PARTY_ROW,
  scroll,
  UNFOLD_FRIENDS,
  UNFOLD_QUESTS,
} from './support/lists';
import { givePhone, ME, ON_CAMPUS, openMain, placeOf } from './support/main';
import { EVENT, FRIEND, lookOf, OTHER_FRIEND, press, wordsUnder } from './support/markers';
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

describe("the main screen's friend list", () => {
  it('shows the pill with the number of Friends in the list, and a row for every Friend', async () => {
    await openMain();

    expect(screen.getByText('친구')).toBeVisible();
    expect(screen.getByTestId('friend-count')).toHaveTextContent('12');
    expect(screen.getAllByRole('button', { name: / 지도에서 보기$/u })).toHaveLength(12);
    expect(button(FRIEND_ROW)).toHaveTextContent('김민준공강 · 중앙도서관');
    expect(button(FRIEND_ROW_OFF)).toHaveTextContent('서지우위치 꺼짐');
  });

  it("draws a row's dot in the colour of the Friend's status", async () => {
    await openMain();

    // The design system's `live` for a Friend who is free, and its subtle ink for one whose location is off.
    expect(button(FRIEND_ROW).children[0]).toHaveStyle({ backgroundColor: '#0B7A55' });
    expect(button(FRIEND_ROW_OFF).children[0]).toHaveStyle({ backgroundColor: '#8A90A3' });
  });

  it('counts the Friends of a User who has none, and has no row', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'listFriends';
    await openMain();

    expect(screen.getByTestId('friend-count')).toHaveTextContent('0');
    expect(findButton(/ 지도에서 보기$/u)).toBeNull();
  });

  it('collapses and expands by the round button beside the pill, and leaves the Quest list as it is', async () => {
    const user = await openMain();
    expect(button(FOLD_FRIENDS)).toBeExpanded();

    await press(user, FOLD_FRIENDS);

    expect(findButton(FRIEND_ROW)).toBeNull();
    expect(button(UNFOLD_FRIENDS)).toBeCollapsed();
    expect(screen.getByTestId('friend-count')).toHaveTextContent('12');
    expect(button(CLASS_ROW)).toBeVisible();

    await press(user, UNFOLD_FRIENDS);
    expect(button(FRIEND_ROW)).toBeVisible();
  });
});

describe("the window of the friend list's rows", () => {
  // The Friends come in the order of their names: 강도윤, 김민준, 박지호, 서지우 and, the last, 한지민.
  const THIRD = '박지호 지도에서 보기';
  const LAST = '한지민 지도에서 보기';

  it('is three rows high, snaps to the rows and fades as the frame does: solid, then 40%, then nothing', async () => {
    await openMain();

    // Three rows of 56 and two gaps of 2; a step is a row and a gap.
    expect(screen.getByTestId('friend-rows')).toHaveStyle({ maxHeight: 172 });
    expect(screen.getByTestId('friend-rows')).toHaveProp('snapToInterval', 58);
    expect(boxOf(FRIEND_ROW)).toHaveStyle({ opacity: 1 });
    expect(boxOf(THIRD)).toHaveStyle({ opacity: 0.4 });
    expect(boxOf(FRIEND_ROW_OFF)).toHaveStyle({ opacity: 0 });
  });

  it('draws a row solid once it is above the last place, and every row at the end of the list', async () => {
    // The scroll is followed in JavaScript, as on the web, where a test can see it.
    const follow = Animated.event;
    jest
      .spyOn(Animated, 'event')
      .mockImplementation((mapping, config) => follow(mapping, { ...config, useNativeDriver: false }));
    await openMain();

    await scroll(screen.getByTestId('friend-rows'), 58);
    expect(boxOf(THIRD)).toHaveStyle({ opacity: 1 });
    expect(boxOf(FRIEND_ROW_OFF)).toHaveStyle({ opacity: 0.4 });
    expect(boxOf(LAST)).toHaveStyle({ opacity: 0 });

    // Twelve rows in a window of three: nine steps to the end.
    await scroll(screen.getByTestId('friend-rows'), 522);
    expect(boxOf(LAST)).toHaveStyle({ opacity: 1 });
  });

  it('gives the Quest list the same window, and fades none of its three rows', async () => {
    await openMain();

    expect(screen.getByTestId('quest-rows')).toHaveStyle({ maxHeight: 172 });
    for (const row of [CLASS_ROW, PARTY_ROW, DINNER_ROW]) {
      expect(boxOf(row)).toHaveStyle({ opacity: 1 });
    }
  });
});

describe("a press on a Friend's row", () => {
  it('brings the map close to the Friend and opens their card', async () => {
    const user = await openMain();
    const before = placeOf(FRIEND);

    await press(user, FRIEND_ROW);

    expect(screen.getByRole('header', { name: '김민준' })).toBeVisible();
    expect(lookOf(FRIEND)).toBe('person:full:free:f1:selected');
    // The "close" level is past the "names" level: the given name is under the marker.
    expect(wordsUnder(FRIEND, '민준')).toBeVisible();
    expect(placeOf(FRIEND)).not.toEqual(before);
  });

  it('opens the card in place of the one that is open', async () => {
    const user = await openMain();
    await press(user, OTHER_FRIEND);

    await press(user, FRIEND_ROW);

    expect(screen.getAllByTestId('map-card')).toHaveLength(1);
    expect(screen.getByRole('header', { name: '김민준' })).toBeVisible();
  });

  it('says that the location is off for a Friend without a position, for 2000 ms, and moves nothing', async () => {
    const user = await openMain();
    const before = placeOf(FRIEND);

    await press(user, FRIEND_ROW_OFF);

    expect(screen.getByText('서지우님은 위치가 꺼져 있어요')).toBeVisible();
    expect(screen.queryByTestId('map-card')).toBeNull();
    expect(placeOf(FRIEND)).toEqual(before);
    await pass(1900);
    expect(screen.getByText('서지우님은 위치가 꺼져 있어요')).toBeVisible();
    await pass(100);
    expect(screen.queryByText('서지우님은 위치가 꺼져 있어요')).toBeNull();
  });
});

describe("a press on a Friend's row before the map's cards came", () => {
  it('moves the map at once and opens the card when it comes, while the cards of the map are still asked for', async () => {
    // The Friends answer after 300 ms; the map's cards wait for the Global Events, 3000 ms.
    process.env.EXPO_PUBLIC_MOCK_SLOW = 'listGlobalEvents';
    const user = await openMain();
    const before = placeOf(ME);

    await press(user, FRIEND_ROW);

    expect(placeOf(ME)).not.toEqual(before);
    expect(screen.queryByTestId('map-card')).toBeNull();
    await pass(3000);
    expect(screen.getByRole('header', { name: '김민준' })).toBeVisible();
    expect(lookOf(FRIEND)).toBe('person:full:free:f1:selected');
  });

  it('opens nothing when the card was closed or another was asked for before the cards came', async () => {
    process.env.EXPO_PUBLIC_MOCK_SLOW = 'listGlobalEvents';
    const user = await openMain();

    await press(user, FRIEND_ROW);
    await press(user, CLASS_ROW);
    await pass(3000);

    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

describe("the main screen's Quest list", () => {
  it("shows the pill with the number of today's Quests and their rows, the earliest first", async () => {
    await openMain();

    expect(screen.getByText('퀘스트')).toBeVisible();
    expect(screen.getByTestId('quest-count')).toHaveTextContent('3');
    expect(button(CLASS_ROW)).toHaveTextContent('다음 강의 · 23분 후자료구조14:00 · 301동 118호');
    expect(button(PARTY_ROW)).toHaveTextContent('공개 파티 · 활성화 중AI 커리어 설명회 같이 가요17:40 · 301동 앞');
    expect(button(DINNER_ROW)).toHaveTextContent('비공개 파티 · 김민준저녁 약속20:10 · 학생회관 (63동)');
  });

  it("draws a row's kicker in the colour of its kind", async () => {
    await openMain();

    // A class in the muted ink, a Party that others may join in blue, a Shared Quest in the Party's colour.
    expect(screen.getByText('다음 강의 · 23분 후')).toHaveStyle({ color: '#555C74' });
    expect(screen.getByText('공개 파티 · 활성화 중')).toHaveStyle({ color: '#2F6FC0' });
    expect(screen.getByText('비공개 파티 · 김민준')).toHaveStyle({ color: '#B63A07' });
  });

  it('says that the day is empty when there is no Quest', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'listQuests';
    await openMain();

    expect(screen.getByText('오늘 일정 없음')).toBeVisible();
    expect(screen.getByTestId('quest-count')).toHaveTextContent('0');
  });

  it('collapses and expands by its own round button, and leaves the friend list as it is', async () => {
    const user = await openMain();
    expect(button(FOLD_QUESTS)).toBeExpanded();

    await press(user, FOLD_QUESTS);

    expect(findButton(CLASS_ROW)).toBeNull();
    expect(button(UNFOLD_QUESTS)).toBeCollapsed();
    expect(screen.getByTestId('quest-count')).toHaveTextContent('3');
    expect(button(FRIEND_ROW)).toBeVisible();

    await press(user, UNFOLD_QUESTS);
    expect(button(CLASS_ROW)).toBeVisible();
  });
});

describe("a press on a class's row", () => {
  it('brings the map to its place at the level where names show, and says the class and the place', async () => {
    const user = await openMain();
    const before = placeOf(EVENT);

    await press(user, CLASS_ROW);

    // The Global Event stands on the class's building: its pin has its name, and the map moved.
    expect(lookOf(EVENT)).toBe('official:pin');
    expect(wordsUnder(EVENT, 'AI 커리어')).toBeVisible();
    expect(placeOf(EVENT)).not.toEqual(before);
    expect(screen.getByText('자료구조 · 301동 118호')).toBeVisible();
    await pass(2400);
    expect(screen.queryByText('자료구조 · 301동 118호')).toBeNull();
  });

  it('closes a card that is open, as the frame does', async () => {
    const user = await openMain();
    await press(user, FRIEND);

    await press(user, CLASS_ROW);

    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});
