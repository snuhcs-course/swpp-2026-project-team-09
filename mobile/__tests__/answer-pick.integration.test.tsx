/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { ANSWER_CAPABILITIES, type AssistantReply } from '@/api/assistant-types';
import type { PickPlaceOffer, PickTimeOffer } from '@/api/pick-types';
import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap } from './support/answer-map';
import { tapGround } from './support/building';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 26: a Place or a time asked back (PR 448). 지도에서 고르기 turns the map into picking, and a tap on a
// building sends "여기서" with that Place tapped; 시간 고르기 opens a wheel of the day with the Free Time marked, whose
// button sends "HH:MM에". Expected values: PR 448's offers and the ticket's words. The phone's clock is Tuesday
// 2026-10-06 13:00 in Korea.

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

const PLACE_OFFER: PickPlaceOffer = { kind: 'pick-place', label: '지도에서 고르기', text: '여기서' };
const TIME_OFFER: PickTimeOffer = {
  kind: 'pick-time',
  label: '시간 고르기',
  date: '2026-10-07',
  free: [
    { from: '09:00', until: '10:00' },
    { from: '11:15', until: '24:00' },
  ],
};
const JAHAYEON: Place = {
  id: 'b56be928-cbfe-5c4b-aaa1-40171ba126d1',
  number: null,
  name: '자하연식당',
  latitude: 37.46098,
  longitude: 126.95252,
};

function asking(text: string, offer: PickPlaceOffer | PickTimeOffer): AssistantReply {
  return { text, mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, offers: [offer] };
}

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

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('dock-row'));
}

function lastAsked(): unknown {
  return server.received('POST /assistant/messages').at(-1)?.body;
}

it('says pick to the main server', () => {
  expect(ANSWER_CAPABILITIES).toContain('pick');
});

// Partitions: picking started, a building tapped, picking stopped.
describe('a Place picked on the map', () => {
  it('turns the map into picking, and a tap on a building sends 여기서 with that Place', async () => {
    server.on('GET /places/at', { status: 200, body: { place: JAHAYEON, relation: 'inside' } });
    const user = await askOnMap(server, asking('어디서 만날까요?', PLACE_OFFER));

    expect(dock().getByText('어디서 만날까요?')).toBeVisible();
    await user.press(dock().getByRole('button', { name: '지도에서 고르기' }));
    expect(dock().getByText('지도에서 건물을 눌러 주세요')).toBeVisible();
    server.on('POST /assistant/messages', { status: 200, body: asking('좋아요.', PLACE_OFFER) });
    await tapGround();
    await pass(500);

    expect(lastAsked()).toMatchObject({
      messages: [{}, {}, { role: 'user', text: '여기서' }],
      context: { tapped: { kind: 'place', placeId: JAHAYEON.id } },
    });
  });

  it('stops picking from 그만 고르기, and a tap then sends nothing', async () => {
    server.on('GET /places/at', { status: 200, body: { place: JAHAYEON, relation: 'inside' } });
    const user = await askOnMap(server, asking('어디서 만날까요?', PLACE_OFFER));

    await user.press(dock().getByRole('button', { name: '지도에서 고르기' }));
    await user.press(dock().getByRole('button', { name: '그만 고르기' }));
    await tapGround();

    expect(dock().getByText('어디서 만날까요?')).toBeVisible();
    expect(server.received('POST /assistant/messages')).toHaveLength(1);
  });
});

// From the sketch's review: ✕ ends the picking before it closes the answer.
it('ends the picking from ✕, and keeps the answer open', async () => {
  const user = await askOnMap(server, asking('어디서 만날까요?', PLACE_OFFER));

  await user.press(dock().getByRole('button', { name: '지도에서 고르기' }));
  await user.press(screen.getByRole('button', { name: '답 닫기' }));

  expect(dock().getByText('어디서 만날까요?')).toBeVisible();
  expect(dock().getByRole('button', { name: '지도에서 고르기' })).toBeVisible();
});

// Partitions: the wheel opened on tomorrow; a free time and a busy one; picked and closed.
describe('a time picked on the wheel', () => {
  it('opens on the first free time of the day, with the Free Time marked', async () => {
    const user = await askOnMap(server, asking('내일 몇 시에 만날까요?', TIME_OFFER));

    await user.press(dock().getByRole('button', { name: '시간 고르기' }));

    const sheet = within(screen.getByTestId('pick-time-sheet'));
    expect(sheet.getByText('내일(수) 몇 시에?')).toBeVisible();
    expect(sheet.getByLabelText('09:00 빈 시간')).toBeVisible();
    expect(sheet.getByLabelText('10:00')).toBeVisible();
    expect(sheet.getByRole('button', { name: '09:00에' })).toBeEnabled();
  });

  it("sends the time in the middle as the User's words", async () => {
    const user = await askOnMap(server, asking('내일 몇 시에 만날까요?', TIME_OFFER));
    await user.press(dock().getByRole('button', { name: '시간 고르기' }));
    server.on('POST /assistant/messages', { status: 200, body: asking('좋아요.', TIME_OFFER) });

    await user.press(screen.getByRole('button', { name: '09:00에' }));
    await pass(500);

    expect(lastAsked()).toMatchObject({ messages: [{}, {}, { role: 'user', text: '09:00에' }] });
    expect(screen.queryByTestId('pick-time-sheet')).toBeNull();
  });
});
