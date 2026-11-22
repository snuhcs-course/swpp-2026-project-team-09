/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { RestaurantCard } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import { CAREER, MAJOR } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, layStage } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { pressMarker } from './support/made-quest';
import { startFresh } from './support/mocks';
import { answerParty } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 08: the facts asked are read in full on their marks. A restaurant card is a flag on its Place with its
// meal's hours, whose card lists each dish with its price; event cards are flags with each event's own start and end,
// the first as the main flag and the others numbered. The phone's clock stands on Tuesday 2026-10-06 at 13:00 in Korea.

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

const dish = (name: string, price: number): RestaurantCard['restaurant']['lines'][number] => ({
  text: `${name} ${String(price)}`,
  kind: 'dish',
  name,
  price,
});

const LUNCH: RestaurantCard = {
  kind: 'restaurant',
  restaurant: {
    key: '학생회관식당',
    name: '학생회관식당',
    placeNumber: '63',
    date: '2026-10-06',
    meal: 'lunch',
    eatingMinutes: 55,
    lines: [dish('제육볶음', 6000), dish('갈비구이', 6500)],
    hours: { opensAt: '11:30', closesAt: '13:30' },
    people: [{ name: '나', mode: 'walk', minutes: 4, longest: false }],
    proposal: {
      title: '학생회관식당에서 점심',
      description: '',
      joinPolicy: 'closed',
      board: null,
      capacity: 2,
      startsAt: '2026-10-06T13:40:00+09:00',
      place: { id: 'p63', name: '학생회관식당 (63동)' },
      globalEvent: null,
      invitees: [],
    },
  },
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('GET /places', { status: 200, body: PLACES });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function asked(cards: readonly object[]): Promise<Awaited<ReturnType<typeof openMain>>> {
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: '찾아봤어요.', mapButtons: [], cards, proposal: null },
  });
  const user = await openMain();
  await layStage(390, 760);
  await user.type(screen.getByLabelText(AI_INPUT), '오늘 점심 학생회관 메뉴');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

describe('a restaurant card', () => {
  it("stands as a flag with its meal's hours, and its card lists each dish with its price", async () => {
    const user = await asked([LUNCH]);

    expect(mapThings()).toContain('학생회관식당 › · 11:30–13:30 점심');

    await pressMarker(user, '학생회관식당 › · 11:30–13:30 점심');

    const card = within(screen.getByTestId('card-flag-rows'));
    expect(card.getByText('제육볶음')).toBeVisible();
    expect(card.getByText('6,000원')).toBeVisible();
    expect(card.getByText('6,500원')).toBeVisible();
  });
});

describe('event cards', () => {
  it('draw the first as the main flag with its own start and end, and the others numbered', async () => {
    const user = await asked([CAREER, MAJOR].map((globalEvent) => ({ kind: 'globalEvent', globalEvent })));

    expect(mapThings()).toContain('AI 커리어 설명회 › · 18:00–20:00');
    expect(mapThings()).toContainEqual(expect.stringMatching(/^2 지능형통신 연합전공 설명회 › · 17:00 /u));

    await pressMarker(user, 'AI 커리어 설명회 › · 18:00–20:00');

    const card = within(screen.getByTestId('card-flag-rows'));
    expect(card.getByText('18:00–20:00')).toBeVisible();
    expect(card.getByText('301동 대강당')).toBeVisible();
  });
});
