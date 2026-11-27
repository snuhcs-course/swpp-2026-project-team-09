/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { fakePostHog } from './support/posthog';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { eventsOfAction, outsideRegistry, recorded } from './support/usage-actions';
import { openWithUsage } from './support/usage-app';

// Two Users becoming Friends, in the usage data over the fake main server with the PostHog stand-in (P08 ticket 13):
// accepting a Friend Request and accepting an Invite Link each send `friendship_creation_requested` then
// `friendship_creation_completed`, a refused one `_failed`; a User who chose no sends nothing. The layer keeps its
// client for the whole file, as a run of the app does, so the User who chose no comes first.

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

const TOKEN = 'k3J9xQ';
const SENDER = { name: '유지안', department: '경제학부' };
const REQUESTS = {
  received: [{ id: 'r1', sender: { name: '한도경', department: '산업공학과' }, sentAt: '2026-10-06T03:00:00.000Z' }],
  sent: [],
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /friend-requests', { status: 200, body: REQUESTS });
  server.on(`GET /invite-links/${TOKEN}`, { status: 200, body: { sender: SENDER, status: 'usable' } });
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

async function press(user: Awaited<ReturnType<typeof openWithUsage>>['user']): Promise<void> {
  await user.press(screen.getAllByRole('button', { name: '수락' })[0]);
  await pass(1000);
}

it('sends nothing for a User who chose no', async () => {
  server.on('POST /friend-requests/r1/accept', { status: 204 });
  server.on(`POST /invite-links/${TOKEN}/accept`, { status: 204 });
  const { user, client } = await openWithUsage(server, '/me/friends/requests', false);
  await press(user);
  await act(() => {
    router.push(`/invite/${TOKEN}`);
  });
  await pass(500);
  await press(user);

  expect(server.received('POST /friend-requests/r1/accept')).toHaveLength(1);
  expect(server.received(`POST /invite-links/${TOKEN}/accept`)).toHaveLength(1);
  expect(eventsOfAction(client) ?? []).toEqual([]);
});

it('sends the stages of accepting a Friend Request', async () => {
  server.on('POST /friend-requests/r1/accept', { status: 204 });
  const { user, client } = await openWithUsage(server, '/me/friends/requests');

  await press(user);

  expect(screen.getByText('한도경님과 친구가 됐어요')).toBeVisible();
  expect(eventsOfAction(client)).toEqual([
    ['friendship_creation_requested', { how: 'request_accepted' }],
    ['friendship_creation_completed', { how: 'request_accepted' }],
  ]);
});

it('sends the stages of accepting an Invite Link', async () => {
  server.on(`POST /invite-links/${TOKEN}/accept`, { status: 204 });
  const { user, client } = await openWithUsage(server, `/invite/${TOKEN}`);

  await press(user);

  expect(screen.getByText('유지안님과 친구가 됐어요')).toBeVisible();
  expect(eventsOfAction(client)).toEqual([
    ['friendship_creation_requested', { how: 'invite_link_accepted' }],
    ['friendship_creation_completed', { how: 'invite_link_accepted' }],
  ]);
});

it('sends friendship_creation_failed with the code for a refused Invite Link', async () => {
  server.on(`POST /invite-links/${TOKEN}/accept`, refusal(409, 'ALREADY_FRIENDS'));
  const { user, client } = await openWithUsage(server, `/invite/${TOKEN}`);

  await press(user);

  expect(eventsOfAction(client, '/invite-links/:id/accept')).toEqual([
    ['friendship_creation_requested', { how: 'invite_link_accepted' }],
    ['api_request_failed', { route: '/invite-links/:id/accept', method: 'POST', reason: 'refused' }],
    ['friendship_creation_failed', { how: 'invite_link_accepted', reason: 'refused', code: 'ALREADY_FRIENDS' }],
  ]);
});
