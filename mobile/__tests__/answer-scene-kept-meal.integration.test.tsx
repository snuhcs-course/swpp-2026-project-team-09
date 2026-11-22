/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import { CAREER, MAJOR } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 43: a follow-up answered with words alone keeps the answer before it on the map, its Plan's marks, its
// bar, and its main button, while the card says the new words and the caption the new question; a follow-up with its
// own cards replaces the scene. Over the stored answer to "배고파, 민수랑 같이": its first Plan, 302동식당 at 12:15.

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

const PICK = '302동식당 · 12:15 점심';
const FOLLOW_UP = '거기 사람 많아?';
const WORDS_ONLY: AssistantReply = { text: '점심에는 조금 붐벼요.', mapButtons: [], cards: [], proposal: null };
const EVENTS: AssistantReply = {
  text: '설명회 두 개가 있어요.',
  mapButtons: [],
  cards: [MAJOR, CAREER].map((globalEvent) => ({ kind: 'globalEvent' as const, globalEvent })),
  proposal: null,
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

async function followUp(user: Awaited<ReturnType<typeof askOnMap>>, reply: AssistantReply): Promise<void> {
  server.on('POST /assistant/messages', { status: 200, body: reply });
  await user.type(screen.getByLabelText(AI_INPUT), FOLLOW_UP);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

// Partitions: a follow-up of words alone; one with cards of its own.
describe("a meal's answer under a follow-up", () => {
  it('stays on the map with its bar and its main button when the reply is words alone', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await followUp(user, WORDS_ONLY);

    expect(mapThings()).toContain(PICK);
    expect(screen.getByTestId('time-bar')).toBeVisible();
    expect(
      within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }),
    ).toBeVisible();
    expect(card().getByText(WORDS_ONLY.text)).toBeVisible();
    expect(screen.getByTestId('answer-caption')).toHaveTextContent(FOLLOW_UP);
  });

  it('gives way to a reply with cards of its own', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await followUp(user, EVENTS);

    expect(mapThings()).not.toContain(PICK);
    expect(screen.queryByTestId('time-bar')).toBeNull();
  });
});
