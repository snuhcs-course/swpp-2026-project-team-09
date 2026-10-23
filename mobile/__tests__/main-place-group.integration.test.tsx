/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { GlobalEvent } from '@/api/types';
import { pass, screen } from './support/app';
import { answerDining } from './support/dining';
import { answerEvents, CAREER } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { LAYERS } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { lookOf, press, zoomIn } from './support/markers';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW } from './support/server';

// Things of several kinds at one place on the main screen's map: one marker with a small circle for each kind, whose
// card has a chip for each kind and lists that kind's things. The Shared Quest "저녁 약속" stands at 학생회관 (63동),
// whose Place has 학생회관식당 while the 식당 layer is on.

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

// A Global Event at 학생회관, at the very point of the Shared Quest.
const FAIR: GlobalEvent = {
  ...CAREER,
  id: 'e9',
  title: '동아리 박람회',
  place: '학생회관',
  latitude: 37.45932,
  longitude: 126.95058,
};

const EVENT_AND_PARTY = '행사 1개 · 파티 1개 · 학생회관';
const WITH_DINING = '행사 1개 · 파티 1개 · 식당 1개 · 학생회관';
const PARTY_AND_DINING = '파티 1개 · 식당 1개 · 63동';
const DINNER = '파티 · 저녁 약속';
const FAIR_MARKER = '공식 행사 · 동아리 박람회';
const STUDENT_CENTRE = '식당 · 학생회관식당';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerDining(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function toggleDining(user: User): Promise<void> {
  await press(user, LAYERS);
  await user.press(screen.getByRole('togglebutton', { name: /^식당/u }));
  await press(user, '편의기능 레이어 닫기');
  await pass(500);
}

function shown(name: string): ReturnType<typeof screen.queryByRole> {
  return screen.queryByRole('button', { name });
}

describe('things of several kinds at one place', () => {
  it('are one marker with a circle for each kind, read with what is there and where', async () => {
    answerEvents(server, { events: [FAIR] });
    const user = await openMain();

    expect(lookOf(EVENT_AND_PARTY)).toBe('group:official+party:dot');
    expect(shown(FAIR_MARKER)).toBeNull();
    expect(shown(DINNER)).toBeNull();

    await zoomIn(user, 2);

    expect(lookOf(EVENT_AND_PARTY)).toBe('group:official+party:pin');
  });

  it('take in a restaurant while the 식당 layer is on, and let it go when it is turned off', async () => {
    answerEvents(server, { events: [FAIR] });
    const user = await openMain();

    await toggleDining(user);

    expect(lookOf(WITH_DINING)).toBe('group:official+party+dining:dot');
    expect(shown(EVENT_AND_PARTY)).toBeNull();
    expect(shown(STUDENT_CENTRE)).toBeNull();

    await toggleDining(user);

    expect(lookOf(EVENT_AND_PARTY)).toBe('group:official+party:dot');
    expect(shown(WITH_DINING)).toBeNull();
  });

  it('give way to the one thing left when a layer turned off takes the other out', async () => {
    answerEvents(server, { events: [] });
    const user = await openMain();
    expect(lookOf(DINNER)).toBe('party:dot');

    await toggleDining(user);
    expect(lookOf(PARTY_AND_DINING)).toBe('group:party+dining:dot');

    await toggleDining(user);
    expect(lookOf(DINNER)).toBe('party:dot');
    expect(shown(PARTY_AND_DINING)).toBeNull();
  });
});

function chip(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name });
}

describe("the place's card", () => {
  it('has a chip for each kind, lists the chosen kind, and a row opens that thing’s own card', async () => {
    answerEvents(server, { events: [FAIR] });
    const user = await openMain();

    await press(user, EVENT_AND_PARTY);

    expect(screen.getByRole('header', { name: '학생회관' })).toBeVisible();
    expect(screen.getByText('행사 1개 · 파티 1개')).toBeVisible();
    expect(chip('행사 1')).toBeSelected();
    expect(chip('파티 1')).not.toBeSelected();
    expect(shown('동아리 박람회')).toBeVisible();
    expect(shown('저녁 약속')).toBeNull();

    await user.press(chip('파티 1'));

    expect(chip('파티 1')).toBeSelected();
    expect(shown('동아리 박람회')).toBeNull();

    await press(user, '저녁 약속');

    expect(screen.getByRole('header', { name: '저녁 약속' })).toBeVisible();
    expect(screen.getByText('비공개 파티 · 김민준과')).toBeVisible();
    expect(screen.getByRole('button', { name: '길찾기' })).toBeVisible();
    expect(screen.getAllByTestId('map-card')).toHaveLength(1);
    // The place's marker stands for the chosen thing, and looks selected.
    expect(lookOf(EVENT_AND_PARTY)).toBe('group:official+party:dot:selected');
  });

  it('lists the restaurant under 식당, whose card opens the menus', async () => {
    answerEvents(server, { events: [FAIR] });
    const user = await openMain();
    await toggleDining(user);

    await press(user, WITH_DINING);
    await user.press(chip('식당 1'));
    await press(user, '학생회관식당');

    expect(screen.getByRole('header', { name: '학생회관식당' })).toBeVisible();
    expect(screen.getByRole('button', { name: '메뉴 보기' })).toBeVisible();
  });
});
