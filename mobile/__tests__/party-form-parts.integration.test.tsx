/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { font } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { screen } from './support/app';
import { BOOK_TALK, CAREER, MAJOR, pickEvent } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';
import { answerForm, FESTIVAL } from './support/party-form';
import { askMainServer, PHONE_NOW } from './support/server';

// 파티 만들기's event picker: its list and its rows, against the fake main server.

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

const HIDDEN = { includeHiddenElements: true };
const LONG_TITLE = '제147회 규장각 콜로키엄 | 147th Kyujanggak Colloquium';
const LONG_PLACE = '서울대학교 규장각한국학연구원(103동) 1-44호 & Zoom 온라인 회의실(전날 이메일로 접속 안내 예정)';

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerForm(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// The words of an event's row in the picker: the title and the time and place lines.
function rowWords(event: { title: string }): ReturnType<typeof screen.getByTestId> {
  return within(screen.getByRole('button', { name: `행사 · ${event.title}` })).getByTestId('picker-words');
}

function shownEvents(): string[] {
  return screen.getAllByRole('button', { name: /^행사 · /u }).map(({ props }) => String(props.accessibilityLabel));
}

describe('the event picker', () => {
  // The main server lists them by their start, which the 행사 tab keeps.
  it('lists every event in one list, as the 행사 tab orders them, without tabs, and the search finds across them', async () => {
    server.on('GET /global-events', { status: 200, body: [CAREER, MAJOR, FESTIVAL, BOOK_TALK] });
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '관련 행사 고르기' }));

    for (const name of ['진로', '이벤트', '축제']) {
      expect(screen.queryByRole('tab', { name })).toBeNull();
    }
    expect(shownEvents()).toEqual([CAREER, MAJOR, FESTIVAL, BOOK_TALK].map(({ title }) => `행사 · ${title}`));

    await user.type(screen.getByLabelText('행사 검색'), '설명회');
    expect(shownEvents()).toEqual([`행사 · ${CAREER.title}`, `행사 · ${MAJOR.title}`]);
    await user.clear(screen.getByLabelText('행사 검색'));
    await user.type(screen.getByLabelText('행사 검색'), '공연');
    expect(shownEvents()).toEqual([`행사 · ${FESTIVAL.title}`]);
  });

  it('fills the place and the time from a festival, leaves the title empty, and shows no kind over the event', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '관련 행사 고르기' }));
    await pickEvent(user, FESTIVAL);

    const box = within(screen.getByTestId('plan-box'));
    expect(box.getByRole('button', { name: `관련 행사 ${FESTIVAL.title}` })).toBeVisible();
    expect(box.queryByText('축제')).toBeNull();
    expect(screen.getByLabelText('제목')).toHaveDisplayValue('');
    expect(box.getByRole('button', { name: '어디서 버들골 풍산마당' })).toBeVisible();
    expect(box.getByRole('button', { name: /^언제 10월 9일/u })).toBeVisible();
  });
});

describe('a row of the event picker', () => {
  // As the 행사 tab's row (P06 ticket 15), its day and its 56-wide date column included.
  it("sets a row as the 행사 tab's: a long title on two lines, then the time and the place on lines of their own after their icons", async () => {
    server.on('GET /global-events', {
      status: 200,
      body: [
        { ...CAREER, title: LONG_TITLE, place: LONG_PLACE },
        { ...MAJOR, place: null },
      ],
    });
    const user = await openAt('/party-form');

    await user.press(screen.getByRole('button', { name: '관련 행사 고르기' }));

    const career = screen.getByRole('button', { name: `행사 · ${LONG_TITLE}` });
    const row = within(career);
    expect(career).toHaveStyle({ paddingVertical: 12 });
    expect(row.getByTestId('picker-date')).toHaveStyle({ width: 56 });
    expect(row.getByText('6')).toHaveStyle({ fontFamily: font.bold, fontSize: 22, lineHeight: 28 });
    expect(row.getByText('10월 · 오늘')).toHaveStyle({ fontSize: 12, lineHeight: 16 });
    expect(row.getByText(LONG_TITLE)).toHaveStyle({ fontFamily: font.bold, fontSize: 16, lineHeight: 23 });
    expect(row.getByText(LONG_TITLE)).toHaveProp('numberOfLines', 2);
    expect(row.getByTestId('event-icon-clock', HIDDEN)).toBeOnTheScreen();
    expect(row.getByText('18:00–20:00')).toHaveStyle({ fontSize: 13, lineHeight: 18 });
    expect(row.getByText('18:00–20:00')).toHaveProp('numberOfLines', 1);
    expect(row.getByTestId('event-icon-pin', HIDDEN)).toBeOnTheScreen();
    expect(row.getByText(LONG_PLACE)).toHaveProp('numberOfLines', 2);
    expect(row.queryByText('컴퓨터공학부 공지')).toBeNull();
    const major = within(screen.getByRole('button', { name: `행사 · ${MAJOR.title}` }));
    expect(major.getByText('17:00')).toBeVisible();
    expect(major.queryByTestId('event-icon-pin', HIDDEN)).toBeNull();
  });

  // The picker has no ☆: only the chosen row keeps its words clear of its check.
  it("keeps room on the right only for the chosen row's check", async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '관련 행사 고르기' }));
    await pickEvent(user, CAREER);

    await user.press(screen.getByRole('button', { name: /^관련 행사 AI 커리어 설명회/u }));

    expect(rowWords(CAREER)).toHaveStyle({ paddingRight: 32 });
    expect(rowWords(MAJOR)).not.toHaveStyle({ paddingRight: 32 });
  });
});
