// AI-generated with Claude Opus 5.5, 2026-10-09, prompted by Jaehyun0320, reviewed by fyoon46 in #74
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { GlobalEvent } from '@/api/types';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerEvents, CAREER } from './support/events';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { EVENT, lookOf, press, zoomIn } from './support/markers';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW } from './support/server';

// Global Events at one point on the main screen's map: one marker with their count, whose card lists them.

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

// Today at 15:00, where the career talk is.
const TALK: GlobalEvent = {
  ...CAREER,
  id: 'e4',
  title: '컴퓨터공학부 취업 특강',
  startsAt: '2026-10-06T06:00:00.000Z',
  endsAt: null,
};

// Today at 16:00, there too.
const SEMINAR: GlobalEvent = { ...TALK, id: 'e5', title: '딥러닝 세미나', startsAt: '2026-10-06T07:00:00.000Z' };

const TWO_AT_ONE_POINT = '공식 행사 2개 · 301동 대강당';
const THREE_AT_ONE_POINT = '공식 행사 3개 · 301동 대강당';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function listed(title: string): ReturnType<typeof screen.queryByRole> {
  return screen.queryByRole('button', { name: title });
}

describe('Global Events at one point', () => {
  it('are one marker with their count on its pin, read with where they are and the count', async () => {
    answerEvents(server, { events: [CAREER, TALK] });
    const user = await openMain();
    expect(lookOf(TWO_AT_ONE_POINT)).toBe('official:dot');

    await zoomIn(user, 2);

    expect(lookOf(TWO_AT_ONE_POINT)).toBe('official:pin:2');
    expect(screen.queryByRole('button', { name: EVENT })).toBeNull();
    expect(screen.queryByRole('button', { name: '공식 행사 · 컴퓨터공학부 취업 특강' })).toBeNull();
  });

  it('keep the marker of a single event when only one is there', async () => {
    answerEvents(server, { events: [CAREER] });
    await openMain();

    expect(lookOf(EVENT)).toBe('official:dot');
    expect(screen.queryByRole('button', { name: /^공식 행사 \d+개/u })).toBeNull();
  });
});

describe("the merged marker's card", () => {
  it('lists the events at the point, and one chosen opens its own card with its actions', async () => {
    answerEvents(server, { events: [CAREER, TALK] });
    const user = await openMain();

    await press(user, TWO_AT_ONE_POINT);

    expect(screen.getByRole('header', { name: '301동 대강당' })).toBeVisible();
    expect(screen.getByText('공식 행사 2개')).toBeVisible();
    expect(listed('AI 커리어 설명회')).toBeVisible();
    expect(listed('컴퓨터공학부 취업 특강')).toBeVisible();

    await press(user, 'AI 커리어 설명회');

    expect(screen.getByRole('header', { name: 'AI 커리어 설명회' })).toBeVisible();
    expect(screen.getByText('오늘 18:00–20:00')).toBeVisible();
    expect(screen.getAllByTestId('map-card')).toHaveLength(1);
    // The merged marker stands for the chosen event, and looks selected.
    expect(lookOf(TWO_AT_ONE_POINT)).toBe('official:dot:selected');

    await press(user, '같이 갈 사람 찾기');
    await pass(500);

    expect(shownAddress()).toBe(`/party-form?eventId=${CAREER.id}`);
  });
});

describe('the merged marker, as events come and go', () => {
  it('stays the same marker with its card open, and gives way to the event that is left', async () => {
    answerEvents(server, { events: [CAREER, TALK] });
    const user = await openMain();
    await socketServer((socket) => {
      socket.accept();
    });
    await press(user, TWO_AT_ONE_POINT);

    server.on('GET /global-events', { status: 200, body: [CAREER, TALK, SEMINAR] });
    await socketServer((socket) => {
      socket.send('global-events-changed');
    });

    // The same marker: its card stays open, and lists the new event.
    expect(lookOf(THREE_AT_ONE_POINT)).toBe('official:dot:selected');
    expect(screen.getByText('공식 행사 3개')).toBeVisible();
    expect(listed('딥러닝 세미나')).toBeVisible();

    server.on('GET /global-events', { status: 200, body: [TALK, SEMINAR] });
    await socketServer((socket) => {
      socket.send('global-events-changed');
    });

    expect(lookOf(TWO_AT_ONE_POINT)).toBe('official:dot:selected');
    expect(listed('AI 커리어 설명회')).toBeNull();

    server.on('GET /global-events', { status: 200, body: [CAREER] });
    await socketServer((socket) => {
      socket.send('global-events-changed');
    });

    expect(lookOf(EVENT)).toBe('official:dot');
    expect(screen.queryByRole('button', { name: /^공식 행사 \d+개/u })).toBeNull();
  });
});
