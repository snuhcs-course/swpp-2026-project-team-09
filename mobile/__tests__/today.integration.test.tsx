/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { Quest } from '@/api/types';
import type { KeptNotification } from '@/api/waiting-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerParty } from './support/party';
import { ACCEPTED, askMainServer, DINNER, FRIEND_REQUESTS, INVITATION, ME_ID, PHONE_NOW } from './support/server';

// 오늘 (A04 ticket 10), the bar's fourth slot, against the fake main server on Tuesday 6 October 2026 at 13:00 in
// Korea: 답할 것, 오늘 일정 and 지난 알림 on one page.

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

// A Quest of the User's alone on the day of `start` and `end`, in Korea's time.
function quest(id: string, title: string, start: string, end: string, more: Partial<Quest> = {}): Quest {
  const [subQuest] = DINNER.subQuests;
  if (subQuest === undefined) {
    throw new Error('DINNER has a Sub Quest');
  }
  return {
    ...DINNER,
    id,
    title,
    subQuests: [{ ...subQuest, id: `${id}-step`, title, startsAt: start, endsAt: end }],
    ...more,
  };
}

const ME = { id: ME_ID, name: '홍길동', department: '컴퓨터공학부' };
// Over by 13:00: a 파티 at 09:00 and a class at 11:00.
const MORNING = quest('q-morning', '아침 운동', '2026-10-06T09:00:00+09:00', '2026-10-06T10:00:00+09:00');
const CLASS = quest('q-class', '자료구조', '2026-10-06T11:00:00+09:00', '2026-10-06T12:15:00+09:00', {
  classQuest: true,
  holders: [ME],
  joinPolicy: 'closed',
});
// Tomorrow: a class and a 파티.
const TOMORROW_CLASS = quest('q-class-2', '운영체제', '2026-10-07T10:00:00+09:00', '2026-10-07T11:15:00+09:00', {
  classQuest: true,
  holders: [ME],
});
const TOMORROW_PARTY = quest('q-party-2', '보드게임', '2026-10-07T18:30:00+09:00', '2026-10-07T20:00:00+09:00');

// Seven kept Notifications, a minute apart, the newest at 12:58.
const KEPT: KeptNotification[] = Array.from({ length: 7 }, (_, index) => ({
  ...ACCEPTED,
  id: `n${String(index)}`,
  title: `알림 ${String(index + 1)}`,
  at: `2026-10-06T12:${String(52 + index)}:00+09:00`,
  read: true,
}));

let server: FakeServer;
let setAnswers: ReturnType<typeof answerParty>;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server, {
    quests: [MORNING, CLASS, DINNER, TOMORROW_CLASS, TOMORROW_PARTY],
    invitations: [INVITATION],
  });
  server.on('GET /notifications', { status: 200, body: KEPT });
  server.on('POST /notifications/read', { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function openToday(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^오늘/u }));
  await pass(500);
  return user;
}

function sections(): string[] {
  return screen
    .getAllByRole('header')
    .map((header) => String(header.props.accessibilityLabel ?? header.props.children))
    .filter((name) => /^(답할 것|오늘 일정|지난 알림)/u.test(name));
}

function section(name: string): ReturnType<typeof within> {
  return within(screen.getByTestId(`today-${name}`));
}

describe('오늘', () => {
  it('is the tab after the middle, with the date under its title', async () => {
    await openToday();

    expect(screen.getByRole('tab', { name: /^오늘/u })).toBeSelected();
    expect(screen.getByRole('header', { name: '오늘' })).toBeVisible();
    expect(screen.getByText('10월 6일 화요일')).toBeVisible();
    expect(shownAddress()).toBe('/today');
  });

  it('shows 답할 것, 오늘 일정 and 지난 알림 in that order', async () => {
    await openToday();

    expect(sections()).toEqual(['답할 것 1', '오늘 일정', '지난 알림']);
  });

  it('hides 답할 것 when nothing waits', async () => {
    setAnswers({ invitations: [] });
    await openToday();

    expect(sections()).toEqual(['오늘 일정', '지난 알림']);
  });
});

describe('답할 것', () => {
  it('joins the 파티 with 수락 on an invitation, through the call 파티 > 초대 makes, and the row leaves', async () => {
    server.on(`POST /quest-invitations/${INVITATION.id}/accept`, { status: 201, body: DINNER });
    const user = await openToday();

    setAnswers({ invitations: [] });
    await user.press(section('waiting').getByRole('button', { name: '수락' }));
    await pass(500);

    expect(server.received(`POST /quest-invitations/${INVITATION.id}/accept`)).toHaveLength(1);
    expect(screen.queryByTestId('today-waiting')).toBeNull();
  });

  it('declines an invitation with 거절, and 파티 > 초대 shows it gone too', async () => {
    server.on(`POST /quest-invitations/${INVITATION.id}/decline`, { status: 204 });
    const user = await openToday();

    setAnswers({ invitations: [] });
    await user.press(section('waiting').getByRole('button', { name: '거절' }));
    await pass(500);
    await user.press(screen.getByRole('tab', { name: /^파티/u }));
    await user.press(screen.getByRole('tab', { name: /^초대/u }));
    await pass(500);

    expect(server.received(`POST /quest-invitations/${INVITATION.id}/decline`)).toHaveLength(1);
    expect(screen.getByText('받은 초대가 없어요')).toBeVisible();
  });
});

// Capped so that the page stays about one screen and a half (decided 2026-11-29).
describe('답할 것 with more than three rows', () => {
  it('shows the invitation and two more, and every row from 답할 것 N개 모두 보기', async () => {
    const [request] = FRIEND_REQUESTS.received;
    if (request === undefined) {
      throw new Error('FRIEND_REQUESTS has a request');
    }
    server.on('GET /friend-requests', {
      status: 200,
      body: { received: ['a', 'b', 'c'].map((id) => Object.assign({}, request, { id })), sent: [] },
    });
    const user = await openToday();

    expect(sections()[0]).toBe('답할 것 4');
    expect(section('waiting').getAllByRole('button', { name: /님의 (파티 초대|친구 요청)/u })).toHaveLength(3);
    expect(section('waiting').getByRole('button', { name: '수락' })).toBeVisible();

    await user.press(section('waiting').getByRole('button', { name: '답할 것 4개 모두 보기' }));
    await pass(500);

    expect(shownAddress()).toBe('/notifications');
  });
});

describe('the read marks of 지난 알림', () => {
  it('are sent when every unread kept Notification is among the five shown', async () => {
    server.on('GET /notifications', {
      status: 200,
      body: KEPT.map((kept, index) => Object.assign({}, kept, { read: index < 2 })),
    });
    await openToday();

    expect(server.received('POST /notifications/read')).toHaveLength(1);
  });

  it('wait for 알림 모두 보기 while an unread one is past the five', async () => {
    server.on('GET /notifications', {
      status: 200,
      body: KEPT.map((kept) => Object.assign({}, kept, { read: false })),
    });
    const user = await openToday();

    expect(server.received('POST /notifications/read')).toHaveLength(0);
    await user.press(section('kept').getByRole('button', { name: '알림 모두 보기' }));
    await pass(500);
    expect(server.received('POST /notifications/read')).toHaveLength(1);
  });
});

describe('오늘 일정', () => {
  it('folds the rows over into one line, marks now, and has one line for tomorrow', async () => {
    const user = await openToday();
    const day = section('day');

    expect(day.getByRole('button', { name: '지난 일정 2개' })).toBeCollapsed();
    expect(day.queryByText('아침 운동')).toBeNull();
    expect(day.getByText('지금 13:00')).toBeVisible();
    expect(day.getByText(DINNER.title)).toBeVisible();
    expect(day.getByText('20:10')).toBeVisible();
    expect(day.getByText('내일 2개 · 강의 1, 파티 1')).toBeVisible();
    expect(day.queryByText('운영체제')).toBeNull();

    await user.press(day.getByRole('button', { name: '지난 일정 2개' }));

    expect(day.getByRole('button', { name: '지난 일정 2개' })).toBeExpanded();
    expect(day.getByText('아침 운동')).toBeVisible();
    expect(day.getByText('자료구조')).toBeVisible();
  });

  it('opens the room of a 파티 from its row, as the map’s Quest row does', async () => {
    const user = await openToday();

    await user.press(section('day').getByRole('button', { name: new RegExp(DINNER.title, 'u') }));
    await pass(500);

    expect(shownAddress()).toBe(`/room/${DINNER.id}`);
  });

  it('brings the map to a class from its row, in one move', async () => {
    const user = await openToday();
    await user.press(section('day').getByRole('button', { name: '지난 일정 2개' }));

    await user.press(section('day').getByRole('button', { name: /자료구조/u }));
    await pass(500);

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
  });

  it('says 오늘 일정 없음 on a day with nothing', async () => {
    setAnswers({ quests: [] });
    await openToday();

    expect(section('day').getByText('오늘 일정 없음')).toBeVisible();
  });
});

describe('지난 알림', () => {
  it('shows the newest five, and 알림 모두 보기 opens the whole list above the tabs', async () => {
    const user = await openToday();
    const kept = section('kept');

    expect(kept.getByText('알림 7')).toBeVisible();
    expect(kept.getByText('알림 3')).toBeVisible();
    expect(kept.queryByText('알림 2')).toBeNull();

    await user.press(kept.getByRole('button', { name: '알림 모두 보기' }));
    await pass(500);

    expect(screen.getByRole('header', { name: /^알림/u })).toBeVisible();
    expect(screen.getByText('알림 1')).toBeVisible();
    expect(shownAddress()).toBe('/notifications');
    await user.press(screen.getByRole('button', { name: '뒤로' }));
    expect(screen.getByRole('tab', { name: /^오늘/u })).toBeSelected();
  });

  // The rule of P06 ticket 63: a row that opens a card shows the map in one move, with no screen slid over it.
  it('shows the map in one move for a row of a card', async () => {
    const user = await openToday();

    await user.press(section('kept').getByRole('button', { name: /^알림 7/u }));
    await pass(500);

    // The map's tab, which may hide the bar while its card is open: read by the address.
    expect(shownAddress()).toMatch(/^\/main/u);
    expect(screen.queryByRole('header', { name: '오늘' })).toBeNull();
    expect(router.canDismiss()).toBe(false);
  });
});
