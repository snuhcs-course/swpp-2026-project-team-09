/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answer, answerRoom, HIS_PICNIC, openRoom, PICNIC } from './support/room';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// A 파티 the User held that leaves their list, told once on any screen of the signed-in app, against the fake main
// server: removed by its Leader or ended by them, not told apart; never for the User's own leave or end.

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

const GONE = `${PICNIC.title} 파티에서 빠졌어요`;

// Longer than a toast is shown.
const TOAST_GONE_MS = 3000;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The toast's words, or null while none is shown.
function toastWords(): string | null {
  const layer = screen.queryByTestId('toast-layer');
  if (layer === null) {
    return null;
  }
  const [words] = within(layer).getAllByText(/./u);
  return words === undefined ? null : String(words.props.children);
}

// The main server no longer has the User in the Quest: it leaves their list and its room says it is not found.
function takeOut(): void {
  server.on('GET /quests', { status: 200, body: [DINNER] });
  server.on(`GET /quests/${PICNIC.id}`, refusal(404, 'QUEST_NOT_FOUND'));
}

async function connect(): Promise<void> {
  await socketServer((socket) => {
    socket.accept();
  });
}

async function questsChanged(): Promise<void> {
  await socketServer((socket) => {
    socket.send('quests-changed');
  });
  await pass(500);
}

// What the toast layer showed over the next while: each new message once.
async function toastsOver(milliseconds: number): Promise<string[]> {
  const shown: string[] = [];
  for (let passed = 0; passed < milliseconds; passed += 100) {
    const words = toastWords();
    if (words !== null && shown.at(-1) !== words) {
      shown.push(words);
    }
    // oxlint-disable-next-line no-await-in-loop -- the toast layer is looked at as time passes
    await pass(100);
  }
  return shown;
}

describe('a 파티 that leaves the list on another tab', () => {
  it('is told once, and the User stays where they are', async () => {
    const user = await openMain();
    await connect();
    await user.press(screen.getByRole('tab', { name: '행사' }));
    await pass(500);

    takeOut();
    await questsChanged();

    expect(toastWords()).toBe(GONE);
    expect(shownAddress()).toBe('/events');
    await pass(TOAST_GONE_MS);
    await questsChanged();
    expect(await toastsOver(TOAST_GONE_MS)).toEqual([]);
  });

  it('is told the same for a member whose Leader removed them', async () => {
    answerRoom(server, HIS_PICNIC);
    await openMain();
    await connect();

    takeOut();
    await questsChanged();

    expect(toastWords()).toBe(GONE);
  });

  it('is told when the main server could not say whether the User still holds it', async () => {
    await openMain();
    await connect();

    server.on('GET /quests', { status: 200, body: [DINNER] });
    server.on(`GET /quests/${PICNIC.id}`, refusal(500));
    await questsChanged();

    expect(toastWords()).toBe(GONE);
  });

  it('is not told when the Quest only left the list because all its Sub Quests ended', async () => {
    await openMain();
    await connect();

    server.on('GET /quests', { status: 200, body: [DINNER] });
    await questsChanged();

    expect(await toastsOver(TOAST_GONE_MS)).toEqual([]);
  });
});

describe("the User's own leave or end", () => {
  it('leaving a 파티 says only that the User left', async () => {
    answerRoom(server, HIS_PICNIC);
    server.on(`DELETE /quests/${PICNIC.id}`, () => {
      takeOut();
      return { status: 204 };
    });
    const user = await openRoom(HIS_PICNIC);
    await connect();

    await user.press(screen.getByRole('button', { name: '나가기' }));
    await answer(user, '나가기');
    await questsChanged();

    expect(server.received(`DELETE /quests/${PICNIC.id}`)).toHaveLength(1);
    expect(shownAddress()).toBe('/main');
    expect(await toastsOver(TOAST_GONE_MS)).not.toContain(GONE);
  });

  it('ending a 파티 says only that it was ended', async () => {
    server.on(`POST /quests/${PICNIC.id}/end`, () => {
      takeOut();
      return { status: 204 };
    });
    const user = await openRoom();
    await connect();

    await user.press(screen.getByRole('button', { name: '파티 없애기' }));
    await answer(user, '파티 없애기');
    await questsChanged();

    expect(server.received(`POST /quests/${PICNIC.id}/end`)).toHaveLength(1);
    expect(shownAddress()).toBe('/main');
    expect(await toastsOver(TOAST_GONE_MS)).not.toContain(GONE);
  });
});

describe("a refused leave of the User's own", () => {
  it('keeps a later removal told', async () => {
    answerRoom(server, HIS_PICNIC);
    server.on(`DELETE /quests/${PICNIC.id}`, refusal(500));
    const user = await openRoom(HIS_PICNIC);
    await connect();
    await user.press(screen.getByRole('button', { name: '나가기' }));
    await answer(user, '나가기');
    await pass(TOAST_GONE_MS);

    takeOut();
    await questsChanged();

    expect(toastWords()).toBe(GONE);
  });
});

describe('a 파티 that leaves the list while its room is open', () => {
  it('closes the room and is told once', async () => {
    await openRoom();
    await connect();

    takeOut();
    await socketServer((socket) => {
      socket.send('quests-changed');
    });

    expect(await toastsOver(TOAST_GONE_MS)).toEqual([GONE]);
    expect(shownAddress()).toBe('/main');
    expect(await toastsOver(TOAST_GONE_MS)).toEqual([]);
  });
});
