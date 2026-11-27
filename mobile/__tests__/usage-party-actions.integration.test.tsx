/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, fireEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { fakePostHog } from './support/posthog';
import { answerParty, cardName, RUN } from './support/party';
import { answer, answerRoom, PICNIC } from './support/room';
import { askMainServer, DINNER, INVITATION, JOIN_REQUESTS, PHONE_NOW } from './support/server';
import { eventsOfAction, outsideRegistry, recorded } from './support/usage-actions';
import { openWithUsage } from './support/usage-app';

// A Holder joined, in the usage data over the fake main server with the PostHog stand-in (P08 ticket 13): joining an
// Open Quest from 찾기, accepting an invitation, and the Leader accepting a join request each send
// `party_join_requested` then `party_join_completed`; a join refused for a Full Quest sends `party_join_failed` with
// the code and `api_request_failed`; a User who chose no, or turned 내 정보's switch off, sends nothing. The layer
// keeps its client for the whole file, as a run of the app does, so the User who chose no comes first.

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

const APPROVAL = { ...PICNIC, joinPolicy: 'approval' as const };
const ROOM = `/quests/${PICNIC.id}`;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerParty(server, { invitations: [INVITATION] });
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

function card(title: string): ReturnType<typeof within> {
  return within(screen.getByLabelText(title));
}

// 찾기's card opens the 모집글 sheet, whose 참여하기 opens the join sheet.
async function joinRun(user: Awaited<ReturnType<typeof openWithUsage>>['user']): Promise<void> {
  await user.press(screen.getByLabelText(cardName(RUN.title)));
  await user.press(within(screen.getByLabelText('파티 모집글')).getByRole('button', { name: '참여하기' }));
  await answer(user, '참여하기');
}

it('sends nothing for a User who chose no', async () => {
  server.on(`POST /quests/${RUN.id}/join`, { status: 201, body: DINNER });
  const { user, client } = await openWithUsage(server, '/party', false);

  await joinRun(user);

  expect(server.received(`POST /quests/${RUN.id}/join`)).toHaveLength(1);
  expect(eventsOfAction(client) ?? []).toEqual([]);
});

it('sends the stages of joining an Open Quest directly', async () => {
  server.on(`POST /quests/${RUN.id}/join`, { status: 201, body: DINNER });
  const { user, client } = await openWithUsage(server, '/party');

  await joinRun(user);

  expect(eventsOfAction(client)).toEqual([
    ['party_join_requested', { how: 'joined_directly' }],
    ['party_join_completed', { how: 'joined_directly' }],
  ]);
});

it('sends party_join_failed with the code, and api_request_failed, for a Full Quest', async () => {
  server.on(`POST /quests/${RUN.id}/join`, refusal(409, 'QUEST_FULL'));
  const { user, client } = await openWithUsage(server, '/party');

  await joinRun(user);

  expect(eventsOfAction(client, '/quests/:id/join')).toEqual([
    ['party_join_requested', { how: 'joined_directly' }],
    ['api_request_failed', { route: '/quests/:id/join', method: 'POST', reason: 'refused' }],
    ['party_join_failed', { how: 'joined_directly', reason: 'refused', code: 'QUEST_FULL' }],
  ]);
});

it('sends the stages of accepting an invitation', async () => {
  server.on(`POST /quest-invitations/${INVITATION.id}/accept`, { status: 201, body: DINNER });
  const { user, client } = await openWithUsage(server, '/party?tab=invites');

  await user.press(card(INVITATION.quest.title).getByRole('button', { name: '수락' }));
  await pass(500);

  expect(eventsOfAction(client)).toEqual([
    ['party_join_requested', { how: 'invitation_accepted' }],
    ['party_join_completed', { how: 'invitation_accepted' }],
  ]);
});

it("sends the stages of the Leader accepting a join request, from the Leader's phone", async () => {
  answerRoom(server, APPROVAL);
  server.on(`GET ${ROOM}/join-requests`, { status: 200, body: JOIN_REQUESTS });
  server.on(`POST ${ROOM}/join-requests/jr1/accept`, { status: 204 });
  const { user, client } = await openWithUsage(server, `/room/${PICNIC.id}`);

  await user.press(within(screen.getByLabelText('참여 신청')).getAllByRole('button', { name: '수락' })[0]);
  await pass(500);

  expect(server.received(`POST ${ROOM}/join-requests/jr1/accept`)).toHaveLength(1);
  expect(eventsOfAction(client)).toEqual([
    ['party_join_requested', { how: 'request_accepted' }],
    ['party_join_completed', { how: 'request_accepted' }],
  ]);
});

it("sends nothing once 내 정보's switch is turned off", async () => {
  server.on('PUT /users/me/usage-consent', { status: 204 });
  server.on(`POST /quests/${RUN.id}/join`, { status: 201, body: DINNER });
  const { user, client } = await openWithUsage(server, null);
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  await fireEvent(screen.getByRole('switch', { name: '사용 기록 보내기' }), 'valueChange', false);
  await pass(500);

  await act(() => {
    router.navigate('/party');
  });
  await pass(500);
  await joinRun(user);

  expect(server.received(`POST /quests/${RUN.id}/join`)).toHaveLength(1);
  expect(eventsOfAction(client)).toEqual([]);
});
