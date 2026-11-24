/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import { MENU_LOOKUP_REPLY } from '@/api/mock/data/menu-lookup';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 58: an answer that only told a fact, a Restaurant's hours or its menu, leaves the map once a later reply
// comes, even one of words alone: the next question is about something else ("302동 몇시까지해?", then "내일 301동
// 메뉴 뭐야?", answered in words). A Lookup that is not a fact stays under words, as P04 ticket 46 keeps a scene.
// Over the stored menu Lookup of 301동식당.

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

const FOLLOW_UP = '내일 302동 메뉴 뭐야?';
const WORDS_ONLY: AssistantReply = {
  text: '302동식당 내일 점심은 제육볶음이에요.',
  mapButtons: [],
  cards: [],
  proposal: null,
};
const FACT = { ...MENU_LOOKUP_REPLY, lookup: { ...MENU_LOOKUP_REPLY.lookup, fact: true as const } };

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

const restaurantMarks = (): string[] => mapThings().filter((thing) => thing.includes('301동식당'));

async function followUp(user: Awaited<ReturnType<typeof askOnMap>>, reply: AssistantReply): Promise<void> {
  server.on('POST /assistant/messages', { status: 200, body: reply });
  await user.type(screen.getByLabelText(AI_INPUT), FOLLOW_UP);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

// Partitions: a fact Lookup under words alone; a Lookup that is not a fact under words alone.
describe('a Lookup under a follow-up answered with words alone', () => {
  it('leaves the map when it only told a fact', async () => {
    const user = await askOnMap(server, FACT);
    expect(restaurantMarks()).not.toEqual([]);

    await followUp(user, WORDS_ONLY);

    expect(restaurantMarks()).toEqual([]);
    expect(card().getByText(WORDS_ONLY.text)).toBeVisible();
  });

  it('stays when it is not a fact', async () => {
    const user = await askOnMap(server, MENU_LOOKUP_REPLY);
    const marks = restaurantMarks();

    await followUp(user, WORDS_ONLY);

    expect(restaurantMarks()).toEqual(marks);
  });
});
