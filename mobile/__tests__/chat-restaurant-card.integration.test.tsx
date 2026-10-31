/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { RestaurantCard } from '@/api/assistant-types';
import type { MenuLine } from '@/api/menu-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerParty, MY_HIKE, YU_NA } from './support/party';
import { MIN_JUN_HOLDER, SEO_YEON_HOLDER, toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// The Restaurant card of a 공강에 밥 answer, and its 파티 만들기, against the fake main server.

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

const REPLY = '셋이 12:30–13:45에 같이 비어요.';

function dish(name: string, price: number): MenuLine {
  return { text: `${name} : ${price}원`, kind: 'dish', name, price };
}

// Lunch today at 학생회관식당, the phone's clock standing on 2026-10-06 at 13:00 in Korea.
const CARD: RestaurantCard = {
  kind: 'restaurant',
  restaurant: {
    key: '학생회관식당',
    name: '학생회관식당',
    placeNumber: '63',
    date: '2026-10-06',
    meal: 'lunch',
    eatingMinutes: 55,
    lines: [
      dish('제육볶음', 6000),
      { text: '뼈없는감자탕', kind: null, name: null, price: null },
      dish('수제탕수육', 6000),
      dish('갈비구이', 6500),
    ],
    people: [
      { name: '나', mode: 'walk', minutes: 4, longest: false },
      { name: MIN_JUN_HOLDER.name, mode: 'shuttle', minutes: 9, longest: true },
      { name: SEO_YEON_HOLDER.name, mode: null, minutes: null, longest: false },
    ],
    proposal: {
      title: '학생회관식당에서 점심',
      description: '',
      joinPolicy: 'closed',
      board: null,
      capacity: 3,
      startsAt: '2026-10-06T13:40:00+09:00',
      place: { id: 'p63', name: '학생회관식당 (63동)' },
      globalEvent: null,
      invitees: [
        { id: MIN_JUN_HOLDER.id, name: MIN_JUN_HOLDER.name },
        { id: SEO_YEON_HOLDER.id, name: SEO_YEON_HOLDER.name },
      ],
    },
  },
};

const TOMORROW_DINNER: RestaurantCard = {
  kind: 'restaurant',
  restaurant: { ...CARD.restaurant, key: '두레미담', name: '두레미담', date: '2026-10-07', meal: 'dinner', lines: [] },
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('GET /places', { status: 200, body: PLACES });
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Opens the chat and lets the Assistant answer with these cards.
async function answered(cards: readonly object[]): Promise<User> {
  const body = { text: REPLY, mapButtons: ['dining'], cards, proposal: null };
  server.on('POST /assistant/messages', { status: 200, body });
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await user.type(screen.getByLabelText(AI_INPUT), '민수랑 지은이랑 밥');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

function card(key = '학생회관식당'): ReturnType<typeof within> {
  return within(screen.getByTestId(`restaurant-${key}`));
}

function bodies(route: string): unknown[] {
  return server.received(route).map(({ body }) => body);
}

async function openForm(user: User): Promise<void> {
  await user.press(card().getByRole('button', { name: '파티 만들기' }));
  await pass(500);
}

describe('the Restaurant card', () => {
  it('shows its name, its Place and meal, the time to eat, two menu lines and how many more', async () => {
    await answered([CARD]);

    expect(card().getByRole('header', { name: '학생회관식당' })).toBeVisible();
    expect(card().getByText('63동 · 오늘 점심')).toBeVisible();
    expect(card().getByText('식사 가능 시간 55분')).toBeVisible();
    expect(card().getByText('제육볶음 6,000원')).toBeVisible();
    expect(card().getByText('뼈없는감자탕')).toBeVisible();
    expect(card().getByText('외 2개')).toBeVisible();
    expect(card().queryByText('수제탕수육 6,000원')).toBeNull();
    expect(card().getByRole('button', { name: '파티 만들기' })).toBeVisible();
  });

  it('shows a chip per person, the longest highlighted, and "—" for an unknown way', async () => {
    await answered([CARD]);

    expect(card().getByText('나 도보 4분')).toBeVisible();
    expect(card().getByText(`${SEO_YEON_HOLDER.name} —`)).toBeVisible();
    expect(card().getByTestId('longest-way')).toHaveTextContent(`${MIN_JUN_HOLDER.name} 셔틀 9분`);
  });

  it('names another day and meal, and no more lines than it has', async () => {
    await answered([CARD, TOMORROW_DINNER]);

    expect(card('두레미담').getByText('63동 · 내일 저녁')).toBeVisible();
    expect(card('두레미담').queryByText(/^외 /u)).toBeNull();
  });

  it('goes back in the next message by its key', async () => {
    const user = await answered([CARD]);

    await user.type(screen.getByLabelText(AI_INPUT), '면 빼고');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(bodies('POST /assistant/messages').at(-1)).toMatchObject({
      messages: [
        { role: 'user' },
        { role: 'assistant', cards: [{ kind: 'restaurant', id: '학생회관식당' }] },
        { role: 'user', text: '면 빼고' },
      ],
    });
  });
});

describe('파티 만들기 on the Restaurant card', () => {
  it('opens the party form filled from the card, with no model call', async () => {
    const user = await answered([CARD]);

    await openForm(user);

    expect(server.received('POST /assistant/messages')).toHaveLength(1);
    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(shownAddress()).toBe('/party-form?fromProposal=1');
    expect(screen.getByRole('radio', { name: '비공개' })).toBeChecked();
    expect(screen.getByLabelText('제목')).toHaveDisplayValue('학생회관식당에서 점심');
    expect(screen.getByRole('button', { name: '언제 오늘 13:40' })).toBeVisible();
    expect(screen.getByLabelText('어디서')).toHaveDisplayValue('학생회관식당 (63동)');
    expect(screen.getByText('3명')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: MIN_JUN_HOLDER.name })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: SEO_YEON_HOLDER.name })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: YU_NA.name })).not.toBeChecked();
  });

  it("lets the form's own button make the Quest and invite the Friends", async () => {
    const user = await answered([CARD]);
    await openForm(user);

    await user.press(screen.getByRole('button', { name: '파티 만들기' }));
    await pass(500);

    expect(bodies('POST /quests/own')).toEqual([
      {
        title: '학생회관식당에서 점심',
        description: '',
        capacity: 3,
        joinPolicy: 'closed',
        subQuest: {
          title: '학생회관식당에서 점심',
          startsAt: '2026-10-06T13:40:00+09:00',
          place: { placeId: 'p63' },
        },
      },
    ]);
    expect(bodies(`POST /quests/${MY_HIKE.id}/invitations`)).toEqual([
      { userId: MIN_JUN_HOLDER.id },
      { userId: SEO_YEON_HOLDER.id },
    ]);
    expect(toast()).toHaveTextContent('비공개 파티를 만들었어요 · 2명에게 초대 요청');
  });
});

describe('a card the app does not know', () => {
  it('fails the reply as an ordinary failure, as an APK from before the Restaurant card does', async () => {
    await answered([{ kind: 'menu', menu: {} }]);

    expect(screen.getByTestId('assistant-bubble')).toHaveTextContent('지금은 답할 수 없어요', { exact: false });
  });
});
