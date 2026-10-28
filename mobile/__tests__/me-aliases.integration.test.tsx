/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TaughtAlias } from '@/api/alias-types';
import { ALIAS_DELETED, ALIAS_NOT_DELETED } from '@/screens/me/taught-words-screen';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// 내가 가르친 말 under 내 정보: the words the User taught the Assistant, and their deletion, against the fake main
// server.

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

const LIBRARY: TaughtAlias = {
  id: '5a1e0000-0000-4000-8000-000000000001',
  kind: 'place',
  words: '중도',
  target: { id: '0b6f2a10-0000-4c00-8000-000000000062', label: '중앙도서관' },
  uses: 3,
  lastUsedAt: '2026-10-05T03:00:00.000Z',
};
// A Friend who is no Friend any more: the main server names them "친구".
const FORMER_FRIEND: TaughtAlias = {
  id: '5a1e0000-0000-4000-8000-000000000002',
  kind: 'friend',
  words: '민준',
  target: { id: MIN_JUN.id, label: '친구' },
  uses: 1,
  lastUsedAt: '2026-09-28T03:00:00.000Z',
};
const TITLE = '내가 가르친 말';

let server: FakeServer;
let held: TaughtAlias[];

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  held = [LIBRARY, FORMER_FRIEND];
  server.on('GET /assistant/aliases', () => ({ status: 200, body: { aliases: held } }));
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function openMe(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

async function openTaughtWords(): Promise<User> {
  const user = await openMe();
  await user.press(screen.getByRole('button', { name: TITLE }));
  await pass(500);
  return user;
}

describe('the way from 내 정보', () => {
  it('has 내가 가르친 말 right under 친구 관리, which opens the list', async () => {
    const user = await openMe();

    const rows = screen
      .getAllByRole('button')
      .map((button) => String(button.props.accessibilityLabel))
      .filter((name) => ['친구 관리 2', TITLE, '참여 중인 파티 1'].includes(name));
    expect(rows).toEqual(['친구 관리 2', TITLE, '참여 중인 파티 1']);

    await user.press(screen.getByRole('button', { name: TITLE }));
    await pass(500);

    expect(shownAddress()).toBe('/me/aliases');
    expect(screen.getByRole('header', { name: `${TITLE} 2` })).toBeVisible();
  });
});

describe('the list', () => {
  it('shows each with its words, the arrow, what it means, how often and when last', async () => {
    await openTaughtWords();

    expect(screen.getByText('중도 → 중앙도서관')).toBeVisible();
    expect(screen.getByText('3번 · 10월 5일')).toBeVisible();
    expect(screen.getByText('민준 → 친구')).toBeVisible();
    expect(screen.getByText('1번 · 9월 28일')).toBeVisible();
  });

  it('says so when the User taught nothing yet', async () => {
    held = [];

    await openTaughtWords();

    expect(screen.getByText('아직 가르친 말이 없어요')).toBeVisible();
  });
});

describe('지우기', () => {
  it('asks first, then deletes it on the main server and takes its row away', async () => {
    server.on(`DELETE /assistant/aliases/${LIBRARY.id}`, () => {
      held = [FORMER_FRIEND];
      return { status: 204 };
    });
    const user = await openTaughtWords();

    await user.press(screen.getByRole('button', { name: '중도 → 중앙도서관 지우기' }));
    expect(screen.getByText('가르친 말을 지울까요?')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '지우기' }));
    await pass(500);

    expect(server.received(`DELETE /assistant/aliases/${LIBRARY.id}`)).toHaveLength(1);
    expect(screen.getByText(ALIAS_DELETED)).toBeVisible();
    expect(screen.queryByText('중도 → 중앙도서관')).toBeNull();
    expect(screen.getByText('민준 → 친구')).toBeVisible();
  });

  it('deletes nothing after 취소', async () => {
    const user = await openTaughtWords();

    await user.press(screen.getByRole('button', { name: '중도 → 중앙도서관 지우기' }));
    await user.press(screen.getByRole('button', { name: '취소' }));
    await pass(500);

    expect(server.received().filter(({ method }) => method === 'DELETE')).toEqual([]);
    expect(screen.getByText('중도 → 중앙도서관')).toBeVisible();
  });

  it('keeps the row and says so when the main server fails', async () => {
    server.on(`DELETE /assistant/aliases/${LIBRARY.id}`, refusal(500));
    const user = await openTaughtWords();

    await user.press(screen.getByRole('button', { name: '중도 → 중앙도서관 지우기' }));
    await user.press(screen.getByRole('button', { name: '지우기' }));
    await pass(500);

    expect(screen.getByText(ALIAS_NOT_DELETED)).toBeVisible();
    expect(screen.getByText('중도 → 중앙도서관')).toBeVisible();
  });
});
