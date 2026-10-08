import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerEvents, BOOK_TALK, card, CAREER, MAJOR, MY_CAREER, openEvents, shownEvents } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerRoom, openRoom } from './support/room';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// The 행사 tab's list of Global Events from the main server: the filters, the search and the cards.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the list', () => {
  it('shows the published Global Events from the main server, each with its card', async () => {
    answerEvents(server, { quests: [DINNER, MY_CAREER] });
    await openEvents();

    expect(server.received('GET /global-events').length).toBeGreaterThan(0);
    expect(shownEvents()).toEqual([CAREER.title, MAJOR.title, BOOK_TALK.title]);
    expect(card(CAREER).getByText('같이 갈 파티 2개')).toBeVisible();
    expect(card(CAREER).getByText('내 파티')).toBeVisible();
    expect(card(CAREER).getByText('컴퓨터공학부 공지')).toBeVisible();
    expect(card(CAREER).getByRole('header', { name: CAREER.title })).toBeVisible();
    expect(card(CAREER).getByText('오늘 18:00–20:00')).toBeVisible();
    expect(card(CAREER).getByText('301동 대강당')).toBeVisible();
    expect(card(CAREER).getByRole('button', { name: '파티 찾기/모집' })).toBeVisible();
    expect(card(CAREER).getByRole('button', { name: 'AI 매칭' })).toBeVisible();
    expect(card(MAJOR).getByText('10월 8일 (목) 17:00')).toBeVisible();
    expect(card(MAJOR).queryByText('내 파티')).toBeNull();
    expect(card(MAJOR).queryByText(/같이 갈 파티/u)).toBeNull();
    expect(card(MAJOR).queryByText('컴퓨터공학부 공지')).toBeNull();
  });

  it('opens the page of an event in the browser with 자세히, which an event without one has not', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    answerEvents(server);
    const user = await openEvents();

    await user.press(card(CAREER).getByRole('button', { name: '자세히' }));

    expect(openURL).toHaveBeenCalledWith(CAREER.sourceUrl);
    expect(card(MAJOR).queryByRole('button', { name: '자세히' })).toBeNull();
  });
});

describe('the filters and the search', () => {
  it.each([
    ['오늘', [CAREER.title]],
    ['이번 주', [CAREER.title, MAJOR.title]],
    ['파티 모집 중', [CAREER.title]],
    ['전체', [CAREER.title, MAJOR.title, BOOK_TALK.title]],
  ])('keeps the events of the chip %s', async (chip, titles) => {
    answerEvents(server);
    const user = await openEvents();

    await user.press(screen.getByRole('button', { name: chip }));

    expect(shownEvents()).toEqual(titles);
  });

  it('says so when a filter leaves nothing', async () => {
    answerEvents(server, { recruiting: [] });
    const user = await openEvents();

    await user.press(screen.getByRole('button', { name: '파티 모집 중' }));

    expect(screen.getByText('검색 결과가 없어요')).toBeVisible();
  });

  it('searches the titles, the places and the descriptions, and closes the search', async () => {
    answerEvents(server);
    const user = await openEvents();

    await user.press(screen.getByRole('button', { name: '행사 검색' }));
    const field = screen.getByLabelText('행사 검색어');
    await user.type(field, '62-1동');
    expect(shownEvents()).toEqual([BOOK_TALK.title]);
    await user.clear(field);
    await user.type(field, '선발');
    expect(shownEvents()).toEqual([MAJOR.title]);
    await user.type(field, '없는 말');
    expect(screen.getByText('검색 결과가 없어요')).toBeVisible();

    await user.press(screen.getByRole('button', { name: '검색 닫기' }));
    expect(screen.getByRole('header', { name: '행사' })).toBeVisible();
    expect(shownEvents()).toEqual([CAREER.title, MAJOR.title, BOOK_TALK.title]);
  });
});

describe('an empty list', () => {
  it('says that no event is ahead when the main server lists none', async () => {
    answerEvents(server, { events: [] });
    await openEvents();

    expect(screen.getByText('예정된 행사가 없어요')).toBeVisible();
  });
});

describe('the tab opened at one event', () => {
  it('marks the card with a navy border for 2.6 s', async () => {
    answerEvents(server);
    await openEvents();

    await act(() => {
      router.navigate({ pathname: '/events', params: { focus: MAJOR.id } });
    });
    await pass(0);

    expect(screen.getByTestId(`event-${MAJOR.id}`)).toHaveStyle({ borderWidth: 2 });
    expect(screen.getByTestId(`event-${CAREER.id}`)).toHaveStyle({ borderWidth: 1 });
    await pass(2600);
    expect(screen.getByTestId(`event-${MAJOR.id}`)).toHaveStyle({ borderWidth: 1 });
  });

  it("is opened from the event's card in a Quest's room", async () => {
    answerRoom(server, MY_CAREER);
    answerEvents(server, { quests: [DINNER, MY_CAREER] });
    const user = await openRoom(MY_CAREER);

    await user.press(screen.getByRole('button', { name: `행사 · ${CAREER.title}` }));
    await pass(500);

    expect(screen.getByRole('tab', { name: '행사' })).toBeSelected();
    expect(screen.getByTestId(`event-${CAREER.id}`)).toHaveStyle({ borderWidth: 2 });
  });

  it('names the event on the Badge and card of a Quest the Leader titled otherwise', async () => {
    const titled = { ...MY_CAREER, title: '설명회 같이 가요' };
    answerRoom(server, titled);
    answerEvents(server, { quests: [DINNER, titled] });
    await openRoom(titled);

    expect(screen.getByRole('header', { name: '설명회 같이 가요' })).toBeVisible();
    const eventCard = screen.getByRole('button', { name: `행사 · ${CAREER.title}` });
    expect(within(eventCard).getByText(CAREER.title)).toBeVisible();
    // The official Badge over the title, the card, and the attending Sub Quest in the plan.
    expect(screen.getAllByText(CAREER.title)).toHaveLength(3);
  });
});
