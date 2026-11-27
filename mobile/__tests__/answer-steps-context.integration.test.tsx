/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as Capabilities from '@/api/capabilities';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P03 ticket 20, against the fake main server: with steps on screen, a follow-up of an app that says `answers` tells
// the main server every answer's conditions in the order of the steps and the steps whole.

jest.mock('@/api/capabilities', () => ({
  ...jest.requireActual<typeof Capabilities>('@/api/capabilities'),
  saysAnswers: true,
}));
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

const LUNCH: AnswerReply = { ...MEAL_ANSWER, key: 'meal 2026-11-17 lunch' };
const DINNER: AnswerReply = {
  ...MEAL_ANSWER,
  input: { ...MEAL_ANSWER.input, meal: 'dinner' },
  key: 'meal 2026-11-17 dinner',
};

const stepOf = ({ key = '' }: AnswerReply, title: string): ReplyStep => ({
  kind: 'meal',
  title,
  place: {
    placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
    label: '학생회관식당',
    latitude: 37.45932,
    longitude: 126.95058,
  },
  from: null,
  startAt: '2026-11-17T12:00:00+09:00',
  endAt: '2026-11-17T13:00:00+09:00',
  status: 'shown',
  reason: null,
  shows: { kind: 'answer', key },
});

const STEPS = [stepOf(LUNCH, '점심'), stepOf(DINNER, '저녁')];

const TWO_MEALS = { ...MEAL_ANSWER_REPLY, answer: DINNER, answers: [LUNCH, DINNER], steps: STEPS };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerDining(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function ask(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

function lastContext(): unknown {
  const body: unknown = server.received('POST /assistant/messages').at(-1)?.body;
  return typeof body === 'object' && body !== null && 'context' in body ? body.context : undefined;
}

// The app says `answers` here; while it does not, and with one answer on screen, nothing more is sent
// (`steps-context.unit`, `conversation-answers.unit`).
describe('A follow-up on the steps on screen', () => {
  it("tells every answer's conditions in the order of the steps, and the steps whole", async () => {
    server.on('POST /assistant/messages', { status: 200, body: TWO_MEALS, afterMs: 100 });
    const user = await openMain();
    await ask(user, '점심이랑 저녁 짜줘');

    await ask(user, '저녁은 7시로');

    expect(lastContext()).toMatchObject({ answers: [LUNCH.input, DINNER.input], steps: STEPS });
  });
});
