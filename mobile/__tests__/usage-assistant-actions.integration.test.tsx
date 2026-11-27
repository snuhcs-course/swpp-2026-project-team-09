/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { card } from './support/answer-map';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { fakePostHog } from './support/posthog';
import { answerRecalculations, NEW_QUEST_REPLY, POSTED } from './support/row-four';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { eventsOfAction, outsideRegistry, recorded } from './support/usage-actions';
import { openWithUsage } from './support/usage-app';

// The Assistant's reply and a Plan sent, in the usage data over the fake main server with the PostHog stand-in (P08
// ticket 13): a message sends `assistant_reply_requested` then `_completed`, or `_failed` when the main server could
// not answer; "만들고 초대 보내기" on a meal's Plan with a Friend sends `party_creation_*` with `private`, and
// "만들고 모집하기" on a new recruiting Quest with `public`. No event holds the message, a title, a name or a Place.

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

const SENT = { status: 200 } as const;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerRecalculations(server);
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

// The message sent to the Assistant, with the reply the main server gives.
async function ask(words: string, reply: object): Promise<Awaited<ReturnType<typeof openWithUsage>>> {
  server.on('POST /assistant/messages', { ...SENT, body: reply });
  const opened = await openWithUsage(server, null);
  await opened.user.type(screen.getByLabelText(AI_INPUT), words);
  await opened.user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return opened;
}

it('sends the stages of an Assistant reply', async () => {
  const { client } = await ask('배고파, 민수랑 같이', MEAL_ANSWER_REPLY);

  expect(eventsOfAction(client)).toEqual([
    ['assistant_reply_requested', {}],
    ['assistant_reply_completed', {}],
  ]);
});

it('sends assistant_reply_failed and api_request_failed when the main server could not answer', async () => {
  server.on('POST /assistant/messages', refusal(503, 'MODEL_UNAVAILABLE'));
  const { user, client } = await openWithUsage(server, null);
  await user.type(screen.getByLabelText(AI_INPUT), '배고파, 민수랑 같이');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);

  expect(eventsOfAction(client, '/assistant/messages')).toEqual([
    ['assistant_reply_requested', {}],
    ['api_request_failed', { route: '/assistant/messages', method: 'POST', reason: 'server_error' }],
    ['assistant_reply_failed', { reason: 'server_error' }],
  ]);
});

it("sends the stages of a meal's Plan sent with a Friend as private", async () => {
  server.on('POST /plans', { status: 201, body: PLAN_QUEST });
  const { user, client } = await ask('배고파, 민수랑 같이', MEAL_ANSWER_REPLY);

  await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }));
  await pass(500);

  expect(server.received('POST /plans')).toHaveLength(1);
  expect(eventsOfAction(client)).toEqual([
    ['assistant_reply_requested', {}],
    ['assistant_reply_completed', {}],
    ['party_creation_requested', { visibility: 'private' }],
    ['party_creation_completed', { visibility: 'private' }],
  ]);
});

it('sends the stages of a new recruiting Quest posted from a Plan as public', async () => {
  server.on('POST /plans', { status: 201, body: POSTED });
  const { user, client } = await ask('새로 모집', NEW_QUEST_REPLY);

  await user.press(card().getByRole('button', { name: '만들고 모집하기' }));
  await pass(500);

  expect(server.received('POST /plans')).toHaveLength(1);
  expect(eventsOfAction(client)).toEqual([
    ['assistant_reply_requested', {}],
    ['assistant_reply_completed', {}],
    ['party_creation_requested', { visibility: 'public' }],
    ['party_creation_completed', { visibility: 'public' }],
  ]);
});
