/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { Friend, Place } from '@/api/types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, shownAddress } from './support/app';
import { askOnMap, mapThings } from './support/answer-map';
import { holdBackButton } from './support/back';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ME, ON_CAMPUS, openMain, placeOf } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, LOBBY, MIN_JUN, PHONE_NOW } from './support/server';

// The card a press on the User's own dot opens (P02 ticket 19, board a11), over the fake main server: how it closes,
// what stays on the map, "바꾸기", and words sent from it.

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

const HEAD = '지금 친구에게 보이는 나';

// Board a11's 서준, who sees the User's Timetable only: the fake main server's 서지우 with that level.
const SEO_JUN: Friend = { ...JI_WOO, name: '박서준', level: 'timetable', seen: 'timetable', sharing: false };

const ENGINEERING: Place = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
  server.on('GET /friends', { status: 200, body: [MIN_JUN, SEO_JUN] });
  server.on('GET /places/at', { status: 200, body: { place: ENGINEERING, relation: 'inside' } });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function myCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

// Partitions: the card's ✕ and Android's back button; what stays on the map.
describe('the open card of the User', () => {
  it('closes by its ✕, and the dot stays', async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, ME);

    await user.press(myCard().getByRole('button', { name: '닫기' }));

    expect(screen.queryByTestId('map-card')).toBeNull();
    expect(screen.getByRole('button', { name: ME })).toBeVisible();
  });

  it("closes by Android's back button", async () => {
    const back = holdBackButton();
    const user = await openMain({ answerOnMap: true });
    await press(user, ME);

    expect(await back()).toBe(true);

    expect(screen.queryByRole('header', { name: HEAD })).toBeNull();
  });

  it("moves no camera and keeps every Friend's face", async () => {
    const user = await openMain({ answerOnMap: true });
    const before = { at: placeOf(ME), things: mapThings() };

    await press(user, ME);
    await pass(500);

    expect(placeOf(ME)).toEqual(before.at);
    expect(mapThings()).toEqual(before.things);
  });
});

// Partitions: "바꾸기" and a level changed behind it; words typed under the card.
describe('what the card leads to', () => {
  it('opens 위치 공유 from 바꾸기', async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, ME);

    await user.press(myCard().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(shownAddress()).toBe('/me/location-sharing');
  });

  it('shows a level changed on 위치 공유 in its row once the card is seen again', async () => {
    server.on(`PUT /friends/${SEO_JUN.id}/level`, () => {
      // The main server's answer once both ends allow the building.
      server.on('GET /friends', { status: 200, body: [MIN_JUN, { ...SEO_JUN, level: 'building', seen: 'building' }] });
      return { status: 204 };
    });
    const user = await openMain({ answerOnMap: true });
    await press(user, ME);
    await user.press(myCard().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    const choices = within(screen.getByLabelText(`${SEO_JUN.name}님에게 보일 위치`));
    await user.press(choices.getByRole('radio', { name: '지금 있는 건물' }));
    await pass(500);
    await act(() => {
      router.back();
    });
    await pass(500);

    expect(myCard().getByLabelText(`${SEO_JUN.name}, 지금 있는 건물`)).toBeVisible();
  });

  it('gives way to the answer of words sent under it', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY, async (user) => {
      await press(user, ME);
    });

    expect(screen.queryByTestId('map-card')).toBeNull();
    // The first Plan's lines of the stored answer.
    expect(within(screen.getByTestId('answer-card')).getByText('12:15 302동식당')).toBeVisible();
  });
});
