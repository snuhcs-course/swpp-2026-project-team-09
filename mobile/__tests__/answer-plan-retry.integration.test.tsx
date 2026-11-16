/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { takenAloneOf } from '@/api/mock/data/taken-alone';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card } from './support/answer-map';
import { type FakeServer, type Reply, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, NEAR_LIBRARY, ON_CAMPUS, type Phone } from './support/main';
import { startFresh } from './support/mocks';
import { answerRecalculations, ASKER, EVENTS_REPLY, firstPlan, sayOnMap } from './support/row-four';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// "여기로" pressed again on the job fair's Plan (P03 tickets 17 and 19), over the fake main server: the first press met
// no answer, the main server's refusal, or the idempotency key's own refusal, and the User moved before the press
// again. A press again under the same key is the same request, since the main server tells a retry by the key and the
// whole body, which carries where the User was.

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

const TAKEN = takenAloneOf(firstPlan(EVENTS_ANSWER), { id: ASKER, name: '유상', department: '컴퓨터공학부' });

let server: FakeServer;
let phone: Phone;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerRecalculations(server);
  phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// "여기로" met `first`; the User moves near the library, and presses "여기로" again, which the main server makes.
async function pressAgainAfter(first: Reply): Promise<{ key?: string; body: unknown }[]> {
  server.on('POST /plans', first);
  const user = await sayOnMap(server, '오늘 볼 만한 거 있어?', EVENTS_REPLY);
  await user.press(card().getByRole('button', { name: '여기로' }));
  await pass(500);
  await phone.moveTo(NEAR_LIBRARY);
  server.on('POST /plans', { status: 201, body: TAKEN });

  await user.press(card().getByRole('button', { name: '여기로' }));
  await pass(500);

  return server.received('POST /plans').map(({ idempotencyKey, body }) => ({ key: idempotencyKey, body }));
}

// Partitions: no answer, and the first request still on its way. Expected values: the decision on the read of PR 339
// (1): the same key and the same body, where the User was at the first press, and the made card.
describe('"여기로" pressed again after a press that may have made the Quest', () => {
  it.each<[string, Reply]>([
    ['no answer', 'no-answer'],
    ['the first request still on its way', refusal(409, 'IDEMPOTENCY_KEY_IN_USE')],
  ])('after %s, sends the first request again', async (_met, first) => {
    const sent = await pressAgainAfter(first);

    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual(sent[0]);
    expect(sent[1]?.body).toMatchObject({ location: ON_CAMPUS });
    expect(card().getByTestId('taken-card')).toBeVisible();
  });
});

// Partitions: the User's own 파티 for the event, and the key used for another request. Expected values: the review of
// PR 338 (D), and the decision on the read of PR 339 (1): another key, and where the User is now.
describe('"여기로" pressed again after a refusal', () => {
  it.each<[string, Reply]>([
    ["the User's own 파티 for the event", refusal(409, 'SHARED_QUEST_HELD')],
    ['the key used for another request', refusal(422, 'IDEMPOTENCY_KEY_REUSED')],
  ])('after %s, asks anew', async (_met, first) => {
    const sent = await pressAgainAfter(first);

    expect(sent).toHaveLength(2);
    expect(sent[1]?.key).not.toBe(sent[0]?.key);
    expect(sent[1]?.body).toMatchObject({ location: NEAR_LIBRARY });
    expect(card().getByTestId('taken-card')).toBeVisible();
  });
});
