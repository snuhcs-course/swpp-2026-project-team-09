/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { type FakeServer, refusal } from './support/fake-server';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW, RENEWED, TOKENS } from './support/server';
import { ApiError } from '@/api/errors';
import { dropHeldTokens, heldTokens } from '@/auth/tokens';
import { afterUpload, beforeUpload, newestUpload, stoppedWhileClosed } from '@/position/background-rules';
import { uploadInBackground } from '@/position/background-upload';
import type { Measured } from '@/position/phone';
import { listenToSession, type SessionEvent } from '@/session/session-events';
import { keep, readKept } from '@/storage/kept';

// The background task's decisions, and one run of it against the fake main server.

jest.mock('expo-location');
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));

const UPLOADS = 'POST /positions';

const AT = PHONE_NOW.getTime();

// The app's state as the task reads it. React Native's mock in the tests has none.
function appIs(state: 'active' | 'background'): void {
  Object.defineProperty(AppState, 'currentState', { value: state, configurable: true, writable: true });
}

function measured(latitude: number, accuracy: number | null, secondsAgo: number): Measured {
  return { position: { latitude, longitude: 126.95 }, accuracy, measuredAt: AT - secondsAgo * 1000 };
}

describe('before an upload', () => {
  const ALL_ON = { signedIn: true, switchOn: true, chosen: true, inFront: false };

  it('sends in the background, and leaves the front to the sending of the open app', () => {
    expect(beforeUpload(ALL_ON)).toBe('send');
    expect(beforeUpload({ ...ALL_ON, inFront: true })).toBe('skip');
  });

  it.each(['signedIn', 'switchOn', 'chosen'] as const)('stops when %s is off, in front or not', (off) => {
    expect(beforeUpload({ ...ALL_ON, [off]: false })).toBe('stop');
    expect(beforeUpload({ ...ALL_ON, [off]: false, inFront: true })).toBe('stop');
  });
});

describe('after an upload', () => {
  it('goes on after a position kept, the 400s and no answer', () => {
    expect(afterUpload(null)).toBe('go-on');
    expect(afterUpload(new ApiError(400, 'POSITION_TOO_OLD'))).toBe('go-on');
    expect(afterUpload(new ApiError(400, 'POSITION_TOO_INACCURATE'))).toBe('go-on');
    expect(afterUpload(new ApiError(0))).toBe('go-on');
    expect(afterUpload(new ApiError(503))).toBe('go-on');
  });

  it('turns the switch off on MASTER_SWITCH_OFF', () => {
    expect(afterUpload(new ApiError(409, 'MASTER_SWITCH_OFF'))).toBe('switch-off');
  });

  it('stops on a 401 the client could not mend, SESSION_REPLACED and a 403', () => {
    expect(afterUpload(new ApiError(401))).toBe('stop');
    expect(afterUpload(new ApiError(401, 'SESSION_REPLACED'))).toBe('stop');
    expect(afterUpload(new ApiError(403, 'ONBOARDING_REQUIRED'))).toBe('stop');
  });
});

describe('the position of a batch', () => {
  it('is the newest with an accuracy', () => {
    const upload = newestUpload([measured(37.1, 20, 60), measured(37.3, null, 0), measured(37.2, 15, 30)]);

    expect(upload).toEqual({
      latitude: 37.2,
      longitude: 126.95,
      accuracy: 15,
      measuredAt: new Date(AT - 30_000).toISOString(),
    });
  });

  it('is none without an accuracy', () => {
    expect(newestUpload([measured(37.1, null, 0)])).toBeNull();
    expect(newestUpload([])).toBeNull();
  });
});

describe('the notice that background sharing stopped', () => {
  it('is told at the first open of a start that found it running', () => {
    expect(stoppedWhileClosed(true, true)).toBe(true);
    expect(stoppedWhileClosed(true, false)).toBe(false);
    expect(stoppedWhileClosed(false, true)).toBe(false);
  });
});

let server: FakeServer;
let events: SessionEvent[] = [];
let stopListening = (): void => undefined;
const BATCH = [measured(37.459, 12, 0)];

// A start of the app for the task alone, in the background: nothing has read the tokens yet.
async function startTask(): Promise<void> {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  server = await askMainServer({ signedIn: true });
  dropHeldTokens();
  await keep({ signedIn: true, masterSwitch: true, backgroundChosen: true, backgroundRunning: true });
  server.on(UPLOADS, { status: 200, body: { offCampus: false } });
  appIs('background');
  jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true);
  jest.mocked(Location.stopLocationUpdatesAsync).mockClear();
  events = [];
  stopListening = listenToSession((event) => {
    events.push(event);
  });
}

function endTask(): void {
  stopListening();
  jest.useRealTimers();
  jest.restoreAllMocks();
}

function stops(): number {
  return jest.mocked(Location.stopLocationUpdatesAsync).mock.calls.length;
}

describe('a run of the task', () => {
  beforeEach(startTask);
  afterEach(endTask);

  it('reads the tokens from the phone, sends the newest position and goes on', async () => {
    await uploadInBackground(BATCH);

    expect(server.received(UPLOADS)).toHaveLength(1);
    expect(server.received(UPLOADS)[0]?.authorization).toBe(`Bearer ${TOKENS.accessToken}`);
    expect(stops()).toBe(0);
  });

  it('sends nothing while the app is in front', async () => {
    appIs('active');

    await uploadInBackground(BATCH);

    expect(server.received(UPLOADS)).toEqual([]);
    expect(stops()).toBe(0);
  });

  it('reads the Master Switch first, and stops without sending when it is off', async () => {
    await keep({ masterSwitch: false });

    await uploadInBackground(BATCH);

    expect(server.received(UPLOADS)).toEqual([]);
    expect(stops()).toBe(1);
    expect((await readKept()).backgroundRunning).toBe(false);
  });

  it('keeps the switch off and stops on MASTER_SWITCH_OFF', async () => {
    server.on(UPLOADS, refusal(409, 'MASTER_SWITCH_OFF'));

    await uploadInBackground(BATCH);

    expect((await readKept()).masterSwitch).toBe(false);
    expect(stops()).toBe(1);
  });
});

describe('a run of the task and the Session', () => {
  beforeEach(startTask);
  afterEach(endTask);

  it('renews the Session itself on a 401 and sends again', async () => {
    server.on(UPLOADS, (request) =>
      request.authorization === `Bearer ${RENEWED.accessToken}`
        ? { status: 200, body: { offCampus: false } }
        : refusal(401),
    );
    server.on('POST /auth/refresh', { status: 200, body: RENEWED });

    await uploadInBackground(BATCH);

    expect(server.received('POST /auth/refresh')).toHaveLength(1);
    expect(server.received(UPLOADS)).toHaveLength(2);
    expect(heldTokens()).toEqual(RENEWED);
    expect(stops()).toBe(0);
  });

  it('stops as on sign-out when a sign-in on another phone replaced the Session, without a renewal', async () => {
    server.on(UPLOADS, refusal(401, 'SESSION_REPLACED'));

    await uploadInBackground(BATCH);

    expect(server.received('POST /auth/refresh')).toEqual([]);
    expect(events).toEqual([{ kind: 'ended', replaced: true }]);
    expect(stops()).toBe(1);
  });
});
