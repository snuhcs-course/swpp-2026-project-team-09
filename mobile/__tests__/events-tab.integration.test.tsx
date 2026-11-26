/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { color } from '@/design-system';
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

const MARKED = color.blue50;

// The 행사 tab's list of Global Events from the main server: the filters, the search, the rows and the detail sheet.

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

// The User's own 파티 for the career talk, 비공개, with a Friend: nobody else may join it.
const WITH_FRIEND = {
  ...MY_CAREER,
  joinPolicy: 'closed' as const,
  capacity: 2,
  holders: [...MY_CAREER.holders, { id: 'friend', name: '김민준', department: '경영학과' }],
};

const LONG_TITLE = '제147회 규장각 콜로키엄 | 147th Kyujanggak Colloquium';
const LONG_PLACE = '서울대학교 규장각한국학연구원(103동) 1-44호 & Zoom 온라인 회의실(전날 이메일로 접속 안내 예정)';

describe('the list', () => {
  it('shows the published Global Events from the main server, one row each, as the Events frame draws them', async () => {
    answerEvents(server, { quests: [DINNER, MY_CAREER] });
    await openEvents();

    expect(server.received('GET /global-events').length).toBeGreaterThan(0);
    expect(screen.getByRole('header', { name: '다가오는 행사' })).toBeVisible();
    expect(shownEvents()).toEqual([CAREER.title, MAJOR.title, BOOK_TALK.title]);
    expect(card(CAREER).getByText('6')).toBeVisible();
    expect(card(CAREER).getByText('10월 · 오늘')).toBeVisible();
    expect(card(CAREER).getByText('컴퓨터공학부 공지')).toBeVisible();
    expect(card(CAREER).getByRole('button', { name: CAREER.title })).toBeVisible();
    expect(card(CAREER).getByText('18:00–20:00 · 301동 대강당')).toBeVisible();
    // The two recruiting Quests the User can join, as the map card counts them; the User's own beside them.
    expect(card(CAREER).getByRole('button', { name: '모집 중인 파티 2' })).toBeVisible();
    expect(card(CAREER).getByText('내 파티')).toBeVisible();
    // No badge over the title and no button under it: the row opens the details.
    expect(card(CAREER).queryByText(/같이 갈 파티/u)).toBeNull();
    expect(card(CAREER).queryByRole('button', { name: '자세히' })).toBeNull();
    expect(card(CAREER).queryByRole('button', { name: '파티 찾기/모집' })).toBeNull();
    // AI matching left the app's main UI on 2026-11-10: no entry on the row or in the app bar.
    expect(card(CAREER).queryByRole('button', { name: /매칭/u })).toBeNull();
    expect(screen.queryByRole('button', { name: /AI 매칭 신청 내역/u })).toBeNull();
    expect(card(MAJOR).getByText('8')).toBeVisible();
    expect(card(MAJOR).getByText('10월 · 목')).toBeVisible();
    expect(card(MAJOR).getByText('17:00 · 뉴미디어통신공동연구소 (132동)')).toBeVisible();
    expect(card(MAJOR).getByRole('button', { name: '함께 갈 파티 찾기' })).toBeVisible();
    expect(card(MAJOR).queryByText('내 파티')).toBeNull();
    expect(card(MAJOR).queryByText('컴퓨터공학부 공지')).toBeNull();
  });

  it('keeps a long title to one line and a long place to two, cut, with the hours before the place', async () => {
    answerEvents(server, { events: [{ ...CAREER, title: LONG_TITLE, place: LONG_PLACE }] });
    await openEvents();

    expect(card(CAREER).getByRole('button', { name: LONG_TITLE })).toHaveProp('numberOfLines', 1);
    expect(card(CAREER).getByText(`18:00–20:00 · ${LONG_PLACE}`)).toHaveProp('numberOfLines', 2);
  });

  it("opens 파티 찾기/모집 from a row's party line", async () => {
    answerEvents(server);
    const user = await openEvents();

    await user.press(card(MAJOR).getByRole('button', { name: '함께 갈 파티 찾기' }));
    await pass(500);

    expect(screen.getByRole('header', { name: '모집 중인 파티 0' })).toBeVisible();
    expect(screen.getByText('아직 모집 중인 파티가 없어요')).toBeVisible();
  });
});

describe("the User's own 파티", () => {
  it("marks the User's own 비공개 파티 as 내 파티, without counting it or keeping it under 파티 모집 중", async () => {
    answerEvents(server, { recruiting: [], quests: [DINNER, WITH_FRIEND] });
    const user = await openEvents();

    expect(card(CAREER).getByText('내 파티')).toBeVisible();
    // As the old card, which offered 파티 찾기/모집 on every event.
    expect(card(CAREER).getByRole('button', { name: '함께 갈 파티 찾기' })).toBeVisible();
    expect(card(CAREER).queryByRole('button', { name: /모집 중인 파티/u })).toBeNull();
    await user.press(screen.getByRole('button', { name: '파티 모집 중' }));
    expect(screen.getByText('해당하는 행사가 없어요')).toBeVisible();
  });
});

describe('the detail sheet', () => {
  it('opens on a press of the row, with the time and the place by their icons, the description and 원문 보기', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    answerEvents(server, { events: [{ ...CAREER, title: LONG_TITLE, place: LONG_PLACE }, MAJOR] });
    const user = await openEvents();

    await user.press(screen.getByTestId(`event-${CAREER.id}`));
    await pass(500);

    expect(screen.getByRole('header', { name: LONG_TITLE })).toBeVisible();
    expect(screen.getByText('오늘 18:00–20:00')).toBeVisible();
    expect(screen.getByText(LONG_PLACE)).toBeVisible();
    // No 언제 and 어디 on the screen, where the icons say it; a screen reader still hears them.
    expect(screen.queryByText('언제')).toBeNull();
    expect(screen.queryByText('어디')).toBeNull();
    expect(screen.getByLabelText('언제, 오늘 18:00–20:00')).toBeVisible();
    expect(screen.getByLabelText(`어디, ${LONG_PLACE}`)).toBeVisible();
    expect(screen.getByText(CAREER.description)).toBeVisible();
    await user.press(screen.getByRole('button', { name: '원문 보기' }));
    expect(openURL).toHaveBeenCalledWith(CAREER.sourceUrl);
  });

  it('has no 원문 보기 without a page, and its party button leads to 파티 찾기/모집', async () => {
    answerEvents(server);
    const user = await openEvents();

    await user.press(card(MAJOR).getByRole('button', { name: MAJOR.title }));
    await pass(500);
    expect(screen.queryByRole('button', { name: '원문 보기' })).toBeNull();
    await user.press(screen.getByRole('button', { name: '파티 찾기/모집' }));
    await pass(500);

    expect(screen.queryByTestId('event-detail')).toBeNull();
    expect(screen.getByRole('header', { name: '모집 중인 파티 0' })).toBeVisible();
  });

  it('counts the recruiting Quests on its party button', async () => {
    answerEvents(server, { quests: [DINNER, WITH_FRIEND] });
    const user = await openEvents();

    await user.press(card(CAREER).getByRole('button', { name: CAREER.title }));
    await pass(500);

    expect(screen.getByRole('button', { name: '모집 중인 파티 2 · 찾기/모집' })).toBeVisible();
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

    expect(screen.getByRole('button', { name: '파티 모집 중' })).toBeSelected();
    expect(screen.getByText('해당하는 행사가 없어요')).toBeVisible();
  });

  it('searches the titles, the places and the descriptions, and closes the search', async () => {
    answerEvents(server);
    const user = await openEvents();

    await user.press(screen.getByRole('button', { name: '행사 검색' }));
    const field = screen.getByLabelText('행사 검색어');
    expect(field).toHaveProp('placeholder', '제목·장소·내용 검색');
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
  it('says what the tab holds when the main server lists no event', async () => {
    answerEvents(server, { events: [] });
    await openEvents();

    expect(screen.getByText('여기서는 학교 행사를 모아 볼 수 있어요')).toBeVisible();
  });
});

describe('the tab opened at one event', () => {
  it('marks the row with a light blue ground for 2.6 s', async () => {
    answerEvents(server);
    await openEvents();

    await act(() => {
      router.navigate({ pathname: '/events', params: { focus: MAJOR.id } });
    });
    await pass(0);

    expect(screen.getByTestId(`event-${MAJOR.id}`)).toHaveStyle({ backgroundColor: MARKED });
    expect(screen.getByTestId(`event-${CAREER.id}`)).not.toHaveStyle({ backgroundColor: MARKED });
    await pass(2600);
    expect(screen.getByTestId(`event-${MAJOR.id}`)).not.toHaveStyle({ backgroundColor: MARKED });
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
