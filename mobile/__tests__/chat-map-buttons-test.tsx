/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, LAYERS } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle } from './support/shuttle';

// The map buttons under the Assistant's answers, against the fake main server.

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

const SHUTTLE_REPLY = '셔틀 두 대가 정문과 자연대에 있어요.';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerShuttle(server);
  answerDining(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Opens the chat, sends a question and lets the Assistant answer with `mapButtons`.
async function answered(mapButtons: string[]): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: { text: SHUTTLE_REPLY, mapButtons, cards: [] } });
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await user.type(screen.getByLabelText(AI_INPUT), '셔틀 어디 있어?');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

// A layer's toggle that is on offers to turn it off.
function on(layer: string): boolean {
  return screen.queryByRole('togglebutton', { name: `${layer} 끄기` }) !== null;
}

// Which layers are on, as the 편의기능 stack shows them.
async function layersOn(user: User): Promise<{ dining: boolean; shuttle: boolean }> {
  await press(user, LAYERS);
  return { dining: on('식당'), shuttle: on('셔틀버스') };
}

describe('a map button under an answer', () => {
  it('shows 지도에서 셔틀 보기 for the shuttle, in the bubble of the answer', async () => {
    await answered(['shuttle']);

    const bubble = within(screen.getByTestId('assistant-bubble'));
    expect(bubble.getByText(SHUTTLE_REPLY)).toBeVisible();
    expect(bubble.getByRole('button', { name: '지도에서 셔틀 보기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '지도에서 식당 보기' })).toBeNull();
  });
});

describe('a map button pressed', () => {
  it('closes the sheet and turns the shuttle layer on', async () => {
    const user = await answered(['shuttle']);

    await user.press(screen.getByRole('button', { name: '지도에서 셔틀 보기' }));
    await pass(500);

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(server.received('GET /shuttle')).toHaveLength(1);
    expect(await layersOn(user)).toEqual({ dining: false, shuttle: true });
  });

  it('closes the sheet and turns the 식당 layer on with 지도에서 식당 보기', async () => {
    const user = await answered(['dining']);

    await user.press(screen.getByRole('button', { name: '지도에서 식당 보기' }));
    await pass(500);

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(await layersOn(user)).toEqual({ dining: true, shuttle: false });
  });

  it('leaves a layer that is on as it is', async () => {
    const user = await answered(['shuttle']);
    await user.press(screen.getByRole('button', { name: '지도에서 셔틀 보기' }));
    await user.press(screen.getByLabelText(AI_INPUT));

    await user.press(screen.getByRole('button', { name: '지도에서 셔틀 보기' }));
    await pass(500);

    expect(await layersOn(user)).toEqual({ dining: false, shuttle: true });
  });
});

describe('a map button', () => {
  it('is not sent back with the next message', async () => {
    const user = await answered(['shuttle']);

    await user.type(screen.getByLabelText(AI_INPUT), '고마워');
    await user.press(screen.getByRole('button', { name: '보내기' }));

    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual({
      messages: [
        { role: 'user', text: '셔틀 어디 있어?' },
        { role: 'assistant', text: SHUTTLE_REPLY, cards: [] },
        { role: 'user', text: '고마워' },
      ],
    });
  });
});
