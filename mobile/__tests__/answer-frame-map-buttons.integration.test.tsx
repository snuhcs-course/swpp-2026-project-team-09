/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, startApp } from './support/app';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, LAYERS } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle } from './support/shuttle';

// The map buttons under the Assistant's answers in the answer frame's card, against the fake main server.

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

// Sends a question from the map's bar and lets the Assistant answer.
async function ask(user: User): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), '셔틀 어디 있어?');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

// Opens the main screen and asks; the Assistant answers with `mapButtons`.
async function answered(mapButtons: string[]): Promise<User> {
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: SHUTTLE_REPLY, mapButtons, cards: [], proposal: null },
  });
  const user = await openMain();
  await ask(user);
  return user;
}

function frame(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
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
  it("shows 지도에서 셔틀 보기 for the shuttle, in the frame's card", async () => {
    await answered(['shuttle']);

    expect(frame().getByText(SHUTTLE_REPLY)).toBeVisible();
    expect(frame().getByRole('button', { name: '지도에서 셔틀 보기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '지도에서 식당 보기' })).toBeNull();
  });
});

describe('a map button pressed', () => {
  it('closes the frame and turns the shuttle layer on', async () => {
    const user = await answered(['shuttle']);

    await user.press(frame().getByRole('button', { name: '지도에서 셔틀 보기' }));
    await pass(500);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(server.received('GET /shuttle')).toHaveLength(1);
    expect(await layersOn(user)).toEqual({ dining: false, shuttle: true });
  });

  it('closes the frame and turns the 식당 layer on with 지도에서 식당 보기', async () => {
    const user = await answered(['dining']);

    await user.press(frame().getByRole('button', { name: '지도에서 식당 보기' }));
    await pass(500);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(await layersOn(user)).toEqual({ dining: true, shuttle: false });
  });

  it('leaves a layer that is on as it is', async () => {
    const user = await answered(['shuttle']);
    await user.press(frame().getByRole('button', { name: '지도에서 셔틀 보기' }));
    await ask(user);

    await user.press(frame().getByRole('button', { name: '지도에서 셔틀 보기' }));
    await pass(500);

    expect(await layersOn(user)).toEqual({ dining: false, shuttle: true });
  });
});

describe('a layer a map button turned on', () => {
  it('is on again when the app starts again (P06 ticket 03)', async () => {
    const user = await answered(['shuttle']);
    await user.press(frame().getByRole('button', { name: '지도에서 셔틀 보기' }));
    await pass(500);

    await screen.unmount();
    await startApp();
    await pass(1000);
    await pass(500);

    expect(server.received('GET /shuttle')).toHaveLength(2);
    expect(await layersOn(user)).toEqual({ dining: false, shuttle: true });
  });
});

describe('a map button', () => {
  it('is not sent back with the next message', async () => {
    const user = await answered(['shuttle']);

    await user.type(screen.getByLabelText(AI_INPUT), '고마워');
    await user.press(screen.getByRole('button', { name: '보내기' }));

    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(
      expect.objectContaining({
        messages: [
          { role: 'user', text: '셔틀 어디 있어?' },
          { role: 'assistant', text: SHUTTLE_REPLY, cards: [] },
          { role: 'user', text: '고마워' },
        ],
      }),
    );
  });
});
