/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerEvents, CAREER, MY_CAREER } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { MY_HIKE } from './support/party';
import { fakePostHog } from './support/posthog';
import { MIN_JUN_HOLDER } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';
import { eventsOfAction, outsideRegistry, recorded } from './support/usage-actions';
import { openWithUsage } from './support/usage-app';

// A 파티 made with the 파티 form, in the usage data over the fake main server with the PostHog stand-in (P08 ticket
// 13): 파티 올리기 sends `party_creation_requested` then `_completed` with `public`, 파티 만들기 of a 비공개 파티 with
// `private`, a refusal `_failed` with the code; recruiting for a Global Event counts too, by attending it. An edit is
// not counted. No event holds the title or the description.

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

type User = Awaited<ReturnType<typeof openWithUsage>>['user'];

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerEvents(server);
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  for (const client of fakePostHog().clients) {
    expect(outsideRegistry(recorded(client))).toEqual([]);
  }
  delete process.env.EXPO_PUBLIC_POSTHOG_TOKEN;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function fillPublic(user: User): Promise<void> {
  await user.type(screen.getByLabelText('제목'), '보드게임 카페 가실 분');
  await user.type(screen.getByLabelText('본문'), '룰 몰라도 알려드려요');
  await user.press(screen.getByRole('button', { name: '게시판 게시판 선택' }));
  await user.press(screen.getByRole('radio', { name: '취미 게시판' }));
}

async function send(user: User, name: string): Promise<void> {
  await user.press(screen.getByRole('button', { name }));
  await pass(500);
}

it('sends the stages of a public 파티 made', async () => {
  const { user, client } = await openWithUsage(server, '/party-form');
  await fillPublic(user);

  await send(user, '파티 올리기');

  expect(server.received('POST /quests/own')).toHaveLength(1);
  expect(eventsOfAction(client)).toEqual([
    ['party_creation_requested', { visibility: 'public' }],
    ['party_creation_completed', { visibility: 'public' }],
  ]);
});

it('sends the stages of a private 파티 made', async () => {
  const { user, client } = await openWithUsage(server, '/party-form');
  await user.press(screen.getByRole('radio', { name: '비공개' }));
  await user.type(screen.getByLabelText('제목'), '저녁 같이');
  await user.press(screen.getByRole('checkbox', { name: MIN_JUN_HOLDER.name }));

  await send(user, '파티 만들기');

  expect(server.received('POST /quests/own')).toHaveLength(1);
  expect(eventsOfAction(client)).toEqual([
    ['party_creation_requested', { visibility: 'private' }],
    ['party_creation_completed', { visibility: 'private' }],
  ]);
});

it('sends party_creation_failed with the code of a refusal', async () => {
  server.on('POST /quests/own', refusal(409, 'BOARD_REQUIRED'));
  const { user, client } = await openWithUsage(server, '/party-form');
  await fillPublic(user);

  await send(user, '파티 올리기');

  expect(eventsOfAction(client, '/quests/own')).toEqual([
    ['party_creation_requested', { visibility: 'public' }],
    ['api_request_failed', { route: '/quests/own', method: 'POST', reason: 'refused' }],
    ['party_creation_failed', { visibility: 'public', reason: 'refused', code: 'BOARD_REQUIRED' }],
  ]);
});

it('counts recruiting for a Global Event by attending it', async () => {
  const titled = { ...MY_CAREER, title: 'AI 커리어 설명회 같이 가요' };
  server.on('POST /quests', { status: 201, body: titled });
  server.on(`PATCH /quests/${MY_CAREER.id}`, { status: 200, body: titled });
  const { user, client } = await openWithUsage(server, `/party-form?eventId=${CAREER.id}`);
  await user.type(screen.getByLabelText('본문'), '설명회 끝나고 저녁도 같이 먹어요');
  await user.press(screen.getByRole('button', { name: '게시판 게시판 선택' }));
  await user.press(screen.getByRole('radio', { name: '진로 게시판' }));

  await send(user, '파티 올리기');

  expect(server.received('POST /quests')).toHaveLength(1);
  expect(eventsOfAction(client)).toEqual([
    ['party_creation_requested', { visibility: 'public' }],
    ['party_creation_completed', { visibility: 'public' }],
  ]);
});
