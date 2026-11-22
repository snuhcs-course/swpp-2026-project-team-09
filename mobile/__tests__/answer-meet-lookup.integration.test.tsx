/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { FRIEND_LOOKUP_REPLY } from '@/api/mock/data/friend-lookup';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, layStage, SEND } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import {
  answerFriendsWithMinSu,
  friendCard,
  MEET,
  meetFromCard,
  meetWith,
  MET_MIN_SU,
  MIN_SU,
  pill,
  row,
} from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';

// A Friend Lookup's `meet` action (P02 ticket 24), over the fake main server: the stored real Lookup of "민수 어디야?"
// (`friend-lookup.json`, board q6), which carries `meet` for 민수, draws "만나고 싶다" as its main button beside
// the input (P04 ticket 05) and asks the same meet as 민수's card does; its answer takes the Lookup's place. Words typed while a meet is
// on screen carry its conditions. The meet's "민수 ✕" is 빼기 in the card of 민수's face (P04 ticket 03).

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

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerFriendsWithMinSu(server);
  server.on('POST /assistant/answers', { status: 200, body: MET_MIN_SU });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the Lookup's buttons, a press on its main one, and the meet's only ✕ after it.
describe("the meet of a Friend's Lookup (q6)", () => {
  it('draws "만나고 싶다" as the main button beside the input, and no "닫기" in the dock', async () => {
    await askOnMap(server, FRIEND_LOOKUP_REPLY);

    expect(beside().getByRole('button', { name: MEET })).toBeVisible();
    expect(card().queryByRole('button', { name: MEET })).toBeNull();
    expect(card().queryByRole('button', { name: '닫기' })).toBeNull();
  });

  it("asks the meet of the User and 민수 today, and the meet's answer takes the Lookup's place", async () => {
    const user = await askOnMap(server, FRIEND_LOOKUP_REPLY);

    await user.press(beside().getByRole('button', { name: MEET }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: meetWith(MIN_SU.id),
        location: ON_CAMPUS,
        clientCapabilities: SENT_CAPABILITIES,
      },
    ]);
    expect(pill().getByText('김민수 · 만나고 싶다')).toBeVisible();
    expect(mapThings()).toContain('302동 앞 · 12:15 만남');
    expect(screen.queryByTestId('lookup-card')).toBeNull();
  });

  it('opens 민수\'s card on the everyday map with "민수 빼기" of that meet', async () => {
    const user = await askOnMap(server, FRIEND_LOOKUP_REPLY, () => layStage(390, 760));
    await user.press(beside().getByRole('button', { name: MEET }));
    await pass(500);

    await pressMarker(user, '민수');
    await user.press(within(screen.getByTestId('mark-card')).getByRole('button', { name: '민수 빼기' }));
    await pass(500);

    expect(recalculations(server)).toHaveLength(1);
    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(friendCard().getByRole('header', { name: MIN_SU.name })).toBeVisible();
  });
});

function lastContext(): unknown {
  const body = server.received('POST /assistant/messages').at(-1)?.body;
  return typeof body === 'object' && body !== null && 'context' in body ? body.context : undefined;
}

// Partitions: words sent while a meet's first Plan is on screen.
describe('words typed while a meet is on screen', () => {
  it("carry the meet's conditions and its Plan's id, and the meet capability", async () => {
    server.on('POST /assistant/messages', { status: 200, body: FRIEND_LOOKUP_REPLY });
    const user = await openMain();
    await user.press(screen.getByRole('button', { name: row(MIN_SU) }));
    await meetFromCard(user);

    await user.type(screen.getByLabelText(AI_INPUT), '수업 끝나고 만날래');
    await user.press(screen.getByRole('button', { name: SEND }));
    await pass(500);

    expect(lastContext()).toMatchObject({ conditions: MET_MIN_SU.input, planId: '302동 앞' });
    expect(server.received('POST /assistant/messages').at(-1)?.body).toMatchObject({
      clientCapabilities: SENT_CAPABILITIES,
    });
  });
});
