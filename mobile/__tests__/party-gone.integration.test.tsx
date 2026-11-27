/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
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
// server: removed by its Leader or ended by them, told apart (P06 ticket 22); never for the User's own leave or end.
// A row of 알림 of a 파티 gone says so when pressed.

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

const GONE = `${PICNIC.title} 파티가 없어졌어요`;
const REMOVED = `${PICNIC.title} 파티에서 내보내졌어요`;
const OUT = `${PICNIC.title} 파티에서 빠졌어요`;

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

// The Leader removed the User: as `takeOut`, and the main server lists the removal.
function removeUser(): void {
  takeOut();
  server.on('GET /quest-removals', {
    status: 200,
    body: [{ questId: PICNIC.id, removedAt: '2026-10-06T03:50:00.000Z' }],
  });
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

  it('is told apart for a member whose Leader removed them', async () => {
    answerRoom(server, HIS_PICNIC);
    await openMain();
    await connect();

    removeUser();
    await questsChanged();

    expect(toastWords()).toBe(REMOVED);
  });

  it('is told when the main server could not say whether the User still holds it', async () => {
    await openMain();
    await connect();

    server.on('GET /quests', { status: 200, body: [DINNER] });
    server.on(`GET /quests/${PICNIC.id}`, refusal(500));
    await questsChanged();

    expect(toastWords()).toBe(OUT);
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

describe("the User's own Quest for a Global Event", () => {
  it('is not told when joining another 파티 for the event deleted it', async () => {
    const festival = { id: 'eeeeeeee-0000-4000-8000-000000000001', title: '가을 축제' };
    server.on('GET /quests', { status: 200, body: [{ ...PICNIC, globalEvent: festival }] });
    await openMain();
    await connect();

    server.on('GET /quests', { status: 200, body: [{ ...DINNER, globalEvent: festival }] });
    server.on(`GET /quests/${PICNIC.id}`, refusal(404, 'QUEST_NOT_FOUND'));
    await questsChanged();

    expect(await toastsOver(TOAST_GONE_MS)).toEqual([]);
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

    removeUser();
    await questsChanged();

    expect(toastWords()).toBe(REMOVED);
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

// Partitions: a Quest taken alone ("여기로", P03 ticket 15) that leaves the list. Expected values: nothing told, as no
// one but the User ends it, and it is no 파티.
describe('a Quest taken alone that leaves the list', () => {
  it('is not told', async () => {
    answerRoom(server, { ...PICNIC, takenAlone: true });
    await openMain();
    await connect();

    takeOut();
    await questsChanged();

    expect(await toastsOver(TOAST_GONE_MS)).toEqual([]);
  });
});

describe('a row of 알림 of a 파티 gone', () => {
  it('says that the 파티 is gone when pressed', async () => {
    server.on('GET /notifications', {
      status: 200,
      body: [
        {
          id: `party-ended:party-gone:${PICNIC.id}`,
          kind: 'party-ended',
          title: `${PICNIC.title} 파티가 없어졌어요`,
          ahead: null,
          line: '김민준님이 파티를 없앴어요',
          at: '2026-10-06T12:58:00+09:00',
          url: `/main?card=party-gone:${PICNIC.id}`,
        },
      ],
    });
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
    await user.press(screen.getByRole('button', { name: /^알림/u }));
    await pass(500);

    await user.press(
      screen.getByRole('button', { name: `${PICNIC.title} 파티가 없어졌어요 · 김민준님이 파티를 없앴어요 · 12:58` }),
    );
    await pass(500);

    expect(toastWords()).toBe('이미 없는 파티예요');
    expect(shownAddress()).toMatch(/^\/main(?:\?card=undefined)?$/u);
  });
});
