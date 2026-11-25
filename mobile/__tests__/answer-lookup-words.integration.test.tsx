/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { DAY_LOOKUP_REPLY } from '@/api/mock/data/day-lookup';
import { NOT_RUNNING_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card } from './support/answer-map';
import { raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 18: the model's words are never dropped beside a Lookup. A 파티 asked for at a time the User has a Class
// is answered with words that say why and the day's Lookup; the words come first in the sheet, the Lookup is what the
// map draws and what the sheet holds under the words, and the earlier answers keep the words too. Expected
// values: the stored day Lookup of 2026-11-17 and words as the model wrote them that night.

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

const WORDS = '그 시간엔 자료구조 수업이 있어요. 수업이 끝나는 15:15부터 파티를 찾아볼까요?';
const DAY_LINE = '11월 17일 화요일 수업 3개';
const WITH_WORDS: AssistantReply = { ...DAY_LOOKUP_REPLY, text: WORDS };

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

// Partitions: at rest, raised, and among the earlier answers.
describe("the model's words beside the day's Lookup", () => {
  it('come first in the sheet, whole, over the Lookup and its lines', async () => {
    await askOnMap(server, WITH_WORDS);

    expect(card().getByText(WORDS)).toBeVisible();
    expect(card().getByText(DAY_LINE)).toBeOnTheScreen();
  });

  it('stand over the Lookup in the raised card', async () => {
    await askOnMap(server, WITH_WORDS);

    await raiseCard();

    expect(card().getByText(WORDS)).toBeVisible();
    expect(card().getByTestId('lookup-card')).toBeVisible();
  });

  it("stand in the caption's list of questions once another is asked, and come back with the Lookup (P04 ticket 10)", async () => {
    const user = await askOnMap(server, WITH_WORDS);
    server.on('POST /assistant/messages', { status: 200, body: NOT_RUNNING_LOOKUP_REPLY });
    await user.type(screen.getByLabelText(AI_INPUT), '기숙사 가는 셔틀 있어?');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    await user.press(screen.getByTestId('answer-caption'));
    const words = WORDS.replaceAll(/[.?]/gu, String.raw`\$&`);
    await user.press(within(screen.getByTestId('question-list')).getByRole('button', { name: new RegExp(words, 'u') }));

    expect(card().getByText(WORDS)).toBeVisible();
  });
});

// Partitions: a shuttle's and a day's Lookup beside the main server's stand-in sentence, which is no words of the
// model's (its `wordless-reply.ts`), as replies kept on phones still hold it.
describe("the main server's stand-in sentence beside a Lookup", () => {
  const STAND_IN = '아래에서 확인해 보세요.';

  it("leaves a shuttle's Lookup its own headline", async () => {
    await askOnMap(server, { ...NOT_RUNNING_LOOKUP_REPLY, text: STAND_IN });

    expect(card().getByText('셔틀은 지금 다니지 않아요 (평일 8–21시)')).toBeVisible();
    expect(screen.queryByText(STAND_IN)).toBeNull();
  });

  it("keeps a day's card open, without the sentence", async () => {
    await askOnMap(server, { ...DAY_LOOKUP_REPLY, text: STAND_IN });

    expect(card().getByTestId('lookup-card')).toBeVisible();
    expect(card().queryByText(STAND_IN)).toBeNull();
  });
});
