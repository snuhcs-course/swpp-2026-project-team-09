/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { ACCEPTED, answerMainScreen, askMainServer, INVITATION, PHONE_NOW } from './support/server';

// 알림's rows under 오늘, 어제 and 이전, by the Korea day of each one's time (P06 ticket 39). The phone's now is 13:00 on
// 6 October 2026 in Korea.

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

const TODAY = { ...ACCEPTED, id: 'today', title: '김민준님이 초대를 수락했어요', at: '2026-10-06T12:58:00+09:00' };
const YESTERDAY = {
  ...ACCEPTED,
  id: 'yesterday',
  title: '이서연님이 초대를 수락했어요',
  at: '2026-10-05T20:00:00+09:00',
};
const LAST_WEEK = {
  ...ACCEPTED,
  id: 'last-week',
  title: '박지훈님이 초대를 수락했어요',
  at: '2026-09-29T09:00:00+09:00',
};
const TWO_DAYS_AGO = {
  ...ACCEPTED,
  id: 'two-days',
  title: '최유나님이 초대를 수락했어요',
  at: '2026-10-04T23:00:00+09:00',
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openNotifications(bell: string): Promise<void> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: bell }));
  await pass(500);
  await user.press(screen.getByRole('button', { name: '알림 모두 보기' }));
  await pass(500);
}

const GROUPS: ReadonlySet<unknown> = new Set(['오늘', '어제', '이전']);

type Host = ReturnType<typeof screen.getByRole>;

function textOf(node: Host): string {
  return node.children.map((child) => (typeof child === 'string' ? child : textOf(child))).join('');
}

// The groups' headings, "# 오늘", and the rows' titles, in the order they stand in 알림. Read inside its panel: the
// screens under it stay mounted, with buttons of their own.
function shownOrder(): string[] {
  return screen
    .getByTestId('full-screen-panel')
    .queryAll(() => true)
    .flatMap((node): string[] => {
      const role: unknown = node.props.accessibilityRole;
      const label: unknown = node.props.accessibilityLabel;
      if (role === 'header' && GROUPS.has(textOf(node))) {
        return [`# ${textOf(node)}`];
      }
      return role === 'button' && typeof label === 'string' && label.includes(' · ')
        ? [label.split(' · ')[0] ?? '']
        : [];
    });
}

describe('the groups of 알림', () => {
  it('stand under 오늘, 어제 and 이전, the latest first in each, with what waits at the top of 오늘', async () => {
    server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });
    server.on('GET /notifications', { status: 200, body: [LAST_WEEK, YESTERDAY, TWO_DAYS_AGO, TODAY] });

    await openNotifications('오늘, 새 소식 1개');

    expect(shownOrder()).toEqual([
      '# 오늘',
      '윤태오님의 파티 초대',
      '김민준님이 초대를 수락했어요',
      '# 어제',
      '이서연님이 초대를 수락했어요',
      '# 이전',
      '최유나님이 초대를 수락했어요',
      '박지훈님이 초대를 수락했어요',
    ]);
  });

  it('leave out a group with no rows', async () => {
    server.on('GET /notifications', { status: 200, body: [LAST_WEEK] });

    await openNotifications('오늘');

    expect(shownOrder()).toEqual(['# 이전', '박지훈님이 초대를 수락했어요']);
  });

  it('are not shown with no rows at all, which leaves "새 알림이 없어요"', async () => {
    server.on('GET /notifications', { status: 200, body: [] });

    await openNotifications('오늘');

    expect(shownOrder()).toEqual([]);
    expect(screen.getByText('새 알림이 없어요')).toBeVisible();
  });
});
