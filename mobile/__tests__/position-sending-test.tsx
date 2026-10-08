import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal, type Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { socketServer } from './support/live';
import { givePhone, NEAR_LIBRARY, ON_CAMPUS, openMain, type Phone } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW } from './support/server';

// The User's position sent to the main server while the Master Switch is on, the permission granted and the app in
// front, from every tab.

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

const UPLOADS = 'POST /positions';
const SWITCH = '친구와 위치 공유';
const OFF_CAMPUS_LINE = '캠퍼스 밖이라 위치가 공유되지 않아요';

let server: FakeServer;
let phone: Phone;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
  server.on(UPLOADS, { status: 200, body: { offCampus: false } });
  phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function uploads(): number {
  return server.received(UPLOADS).length;
}

// The phone tells a new position every second, as iOS does, for this many seconds.
async function walk(seconds: number): Promise<void> {
  if (seconds === 0) {
    return;
  }
  await phone.moveTo(seconds % 2 === 0 ? NEAR_LIBRARY : ON_CAMPUS);
  await pass(1000);
  await walk(seconds - 1);
}

async function openMe(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

describe('the sending', () => {
  it('uploads one position every 5 s while the switch is on, with its accuracy and the time it was measured', async () => {
    await openMain();
    expect(uploads()).toBe(1);

    await walk(10);

    expect(uploads()).toBe(3);
    const [first] = server.received(UPLOADS);
    expect(first?.body).toMatchObject({ ...ON_CAMPUS, accuracy: 10 });
    expect(JSON.stringify(first?.body)).toMatch(/"measuredAt":"2026-10-06T04:00:0\d\.\d{3}Z"/u);
  });

  it('sends nothing while the switch is off', async () => {
    server.on('POST /lobby', { status: 200, body: LOBBY });
    await openMain();

    await walk(10);

    expect(uploads()).toBe(0);
  });

  it('stops in the background and starts again in front', async () => {
    await openMain();

    await phone.goToBackground();
    await walk(10);
    expect(uploads()).toBe(1);

    await phone.comeToFront();
    await walk(1);
    expect(uploads()).toBe(2);
  });
});

describe('the sending after the Session', () => {
  it('stops once the User signs out', async () => {
    server.on('POST /auth/sign-out', { status: 204 });
    const user = await openMe();
    await user.press(screen.getByRole('button', { name: '로그아웃' }));
    // The dialog's button, after the screen's.
    const [, confirm] = screen.getAllByRole('button', { name: '로그아웃' });
    if (confirm === undefined) {
      throw new Error('The dialog has no 로그아웃');
    }
    await user.press(confirm);
    await pass(500);
    const before = uploads();

    await walk(10);

    expect(server.received('POST /auth/sign-out')).toHaveLength(1);
    expect(uploads()).toBe(before);
  });

  it('stops once the Session ends', async () => {
    await openMain();
    await socketServer((socket) => {
      socket.accept();
      socket.send('session-ended', {});
    });
    await pass(500);
    const before = uploads();

    await walk(10);

    expect(uploads()).toBe(before);
  });
});

describe("the main server's answers", () => {
  it('says that the User is not shared off campus, until a position is kept again', async () => {
    server.on(UPLOADS, { status: 200, body: { offCampus: true } });
    await openMe();

    expect(screen.getByText(OFF_CAMPUS_LINE)).toBeVisible();
    server.on(UPLOADS, { status: 200, body: { offCampus: false } });
    await walk(6);
    expect(screen.queryByText(OFF_CAMPUS_LINE)).toBeNull();
  });

  it('turns the switch off and fetches the Lobby again when the switch is off on the main server', async () => {
    await openMe();
    const lobbies = server.received('POST /lobby').length;
    server.on(UPLOADS, refusal(409, 'MASTER_SWITCH_OFF'));
    server.on('POST /lobby', { status: 200, body: LOBBY });

    await walk(6);
    const sent = uploads();
    await walk(10);

    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
    expect(server.received('POST /lobby')).toHaveLength(lobbies + 1);
    expect(uploads()).toBe(sent);
  });

  it.each<[string, Reply]>([
    ['POSITION_TOO_OLD', refusal(400, 'POSITION_TOO_OLD')],
    ['POSITION_IN_THE_FUTURE', refusal(400, 'POSITION_IN_THE_FUTURE')],
    ['POSITION_TOO_INACCURATE', refusal(400, 'POSITION_TOO_INACCURATE')],
    ['no answer', 'no-answer'],
  ])('drops a position refused with %s, and sends the next one', async (_name, reply) => {
    server.on(UPLOADS, reply);
    await openMain();

    await walk(6);

    expect(uploads()).toBe(2);
  });
});
