import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { Quest } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerRoom, HIS_PICNIC, openRoom, PICNIC } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// Marking the room's Sub Quests done and undoing the mark, and where the Quest is listed then, against the fake main
// server.

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

const [MEET] = PICNIC.subQuests;
const STEPS = `/quests/${PICNIC.id}/sub-quests`;

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

describe('a Sub Quest done', () => {
  it('shows a Sub Quest done faded, and unmarks it on a press', async () => {
    let done = true;
    const read = (): Quest => ({
      ...HIS_PICNIC,
      subQuests: HIS_PICNIC.subQuests.map((one) => (one.id === MEET?.id ? { ...one, done } : one)),
    });
    answerRoom(server, read());
    server.on(`GET /quests/${PICNIC.id}`, () => ({ status: 200, body: read() }));
    server.on(`DELETE ${STEPS}/${MEET?.id}/done`, () => {
      done = false;
      return { status: 204 };
    });
    const user = await openRoom(HIS_PICNIC);
    const [first] = screen.getAllByTestId('plan-step');

    expect(first).toHaveStyle({ opacity: 0.45 });
    expect(screen.getAllByRole('button', { name: '완료로 표시' })).toHaveLength(1);
    await user.press(screen.getByRole('button', { name: '완료 취소' }));
    await pass(500);

    expect(server.received(`DELETE ${STEPS}/${MEET?.id}/done`)).toHaveLength(1);
    expect(screen.getAllByTestId('plan-step')[0]).not.toHaveStyle({ opacity: 0.45 });
    expect(screen.queryByRole('button', { name: '완료 취소' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '완료로 표시' })).toHaveLength(2);
  });
});

describe('every Sub Quest done', () => {
  it("keeps the Quest in 내 파티 and the main screen's Quest list once every Sub Quest is done", async () => {
    const done = new Set<string>();
    const read = (): Quest => ({
      ...PICNIC,
      subQuests: PICNIC.subQuests.map((one) => ({ ...one, done: done.has(one.id) })),
    });
    server.on('GET /quests', () => ({ status: 200, body: [read()] }));
    server.on(`GET /quests/${PICNIC.id}`, () => ({ status: 200, body: read() }));
    for (const { id } of PICNIC.subQuests) {
      server.on(`POST ${STEPS}/${id}/done`, () => {
        done.add(id);
        return { status: 204 };
      });
    }
    const user = await openRoom();

    await user.press(screen.getAllByRole('button', { name: '완료로 표시' })[0]);
    await pass(500);
    await user.press(screen.getByRole('button', { name: '완료로 표시' }));
    await pass(500);
    expect(screen.getAllByRole('button', { name: '완료 취소' })).toHaveLength(2);
    await act(() => {
      router.navigate('/party?tab=mine');
    });
    await pass(500);
    expect(screen.getByRole('button', { name: PICNIC.title })).toBeVisible();
    await act(() => {
      router.navigate('/quests');
    });
    await pass(500);

    expect(screen.getByRole('button', { name: new RegExp(PICNIC.title, 'u') })).toBeVisible();
  });
});
