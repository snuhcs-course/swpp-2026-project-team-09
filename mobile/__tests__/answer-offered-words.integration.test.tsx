/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A reply in words with a button under it, in the answer frame against the fake main server (P01 ticket 14, board
// q11): "학생증 어디서 받아?" is answered with the Tutorial's facts and 가는 길 보기, which sends its words as a new turn.
// The map draws nothing for it.

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

const ASKED = '학생증 어디서 받아?';
const FACTS = '두레문예관(67동) 2층 학생지원센터에서 받아요. MySNU에서 신청한 다음 날부터, 평일 9:00–17:50에 받아요.';
const WAY_WORDS = '학생증(S-CARD) 발급받기 가는 길';

const REPLY = {
  text: FACTS,
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: null,
  offers: [{ kind: 'ask', label: '가는 길 보기', text: WAY_WORDS }],
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

type User = Awaited<ReturnType<typeof openMain>>;

async function ask(body: object): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body, afterMs: 1000 });
  const user = await openMain({ answerOnMap: true });
  await user.type(screen.getByLabelText(AI_INPUT), ASKED);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(1000);
  return user;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

describe('a reply in words with a button under it', () => {
  it("shows the model's words and 가는 길 보기 under them, with no condition chips", async () => {
    await ask(REPLY);

    expect(card().getByText(FACTS)).toBeVisible();
    expect(card().getByRole('button', { name: '가는 길 보기' })).toBeVisible();
    expect(screen.queryByTestId('condition-chips')).toBeNull();
  });

  it('sends the words of the button as a new turn of the conversation', async () => {
    const user = await ask(REPLY);

    await user.press(card().getByRole('button', { name: '가는 길 보기' }));
    await pass(1000);

    expect(server.received('POST /assistant/messages').at(-1)?.body).toMatchObject({
      messages: [
        { role: 'user', text: ASKED },
        { role: 'assistant', text: FACTS },
        { role: 'user', text: WAY_WORDS },
      ],
    });
  });

  it('shows the words alone from a main server that sends no buttons', async () => {
    const { offers: _offers, ...before } = REPLY;
    await ask(before);

    expect(card().getByText(FACTS)).toBeVisible();
    expect(card().queryByRole('button', { name: '가는 길 보기' })).toBeNull();
  });
});
