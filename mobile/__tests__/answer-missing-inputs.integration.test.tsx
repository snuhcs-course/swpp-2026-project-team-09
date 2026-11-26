/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { raiseCard } from './support/card-grip';
import { askOnMap, card } from './support/answer-map';
import { recalculations, step } from './support/answer-correct';
import { pass, screen, shownAddress } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';
import {
  NO_LOCATION_ANSWER,
  NO_LOCATION_REPLY,
  NO_TIMETABLE_ANSWER,
  NO_TIMETABLE_REPLY,
} from '@/api/mock/data/missing-inputs';
import { LEAVE_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { PlanQuest } from '@/api/plan-quest-types';

// Without a location or a Timetable (P02-13), in the answer frame against the fake main server: the card says what
// the answer assumed, on the User's start and in the pick's card, and a meal Plan's offers are hint lines under the
// Assistant's words, over the list, each opening its screen (P04 ticket 86); the answer is asked again once the
// location is allowed.

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

const EXPLANATION = '지도에 내 아바타를 보여 주려면 위치 권한이 필요해요.';
const N14_NOTE = '캠퍼스 밖이라 친구에게 내 위치가 보이지 않아요';
const START = '나';
const LOCATION_HINT = '위치를 켜면 지금 있는 곳에서 가까운 순으로 봐요';
const TIMETABLE_HINT = '시간표를 넣으면 나설 시각까지 알려 드려요';
const MAKE_ALONE = '일정에 넣기';
// The stored Quest as the main server makes it of a Plan for one person, with no reminder.
const [ASKER] = PLAN_QUEST.quest.members ?? [];
const MADE_ALONE: PlanQuest = {
  quest: { ...PLAN_QUEST.quest, capacity: 1, takenAlone: true, members: ASKER === undefined ? [] : [ASKER] },
  invitations: [],
  askLevels: [],
  alone: { lines: [[{ text: '301동식당에서 먹어요', strong: false }]], remindAt: null },
};
const PICK = '301동식당 · 11:50 점심';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
});

function markCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('mark-card'));
}

// The meal card's parts from the top: the words, the hint lines, and the list.
function sheetOrder(): unknown[] {
  return card()
    .getAllByTestId(/^(?:meal-words|answer-hint-.+|meal-list)$/u)
    .map(({ props }: { props: { testID?: unknown } }) => props.testID);
}

// No button stands under the list: no row of steps, and no button of an offer's label.
function noButtonRow(): void {
  expect(card().queryByTestId('plan-steps')).toBeNull();
  expect(card().queryByRole('button', { name: '위치 켜기' })).toBeNull();
  expect(card().queryByRole('button', { name: '시간표 넣기' })).toBeNull();
}

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the request without the permission; an answer with an offer and no note (n13), with a note and an
// offer (n15), with both offers, with an offer of a main server before P04 ticket 86 (no hint), and a Lookup with a
// note and no action (n14); the location allowed after the hint, and a recalculation that still lacks it. Expected
// values: the stored copies of the main server's answers, board n14's words, and the boards of P04 ticket 86.
describe('board n13: no location permission', () => {
  it('is asked with no position and the reason, the permission missing', async () => {
    givePhone({ permission: 'refused' });
    await askOnMap(server, NO_LOCATION_REPLY);

    const [sent] = server.received('POST /assistant/messages');
    expect(sent?.body).toMatchObject({ context: { location: null, locationMissing: 'permission' } });
  });

  it("says where the answer took the User to set out from, on the User's start", async () => {
    givePhone({ permission: 'refused' });
    const user = await askOnMap(server, NO_LOCATION_REPLY, () => layStage(390, 760));

    await pressMarker(user, START);

    expect(markCard().getByText('출발 · 301동에서')).toBeVisible();
  });

  it('says 위치 켜기 as a hint line under the words, over the list, which opens the explanation', async () => {
    givePhone({ permission: 'refused' });
    const user = await askOnMap(server, NO_LOCATION_REPLY);

    expect(sheetOrder()).toEqual(['meal-words', 'answer-hint-location', 'meal-list']);
    noButtonRow();
    await user.press(card().getByRole('button', { name: LOCATION_HINT }));

    expect(screen.getByText(EXPLANATION)).toBeVisible();
  });
});

describe('board n13, the location allowed from its hint', () => {
  it('asks the same conditions again from the position, with no message', async () => {
    givePhone({ permission: 'refused', prompt: 'granted', position: ON_CAMPUS });
    server.on('POST /assistant/answers', { status: 200, body: NO_TIMETABLE_ANSWER });
    const user = await askOnMap(server, NO_LOCATION_REPLY);

    await user.press(card().getByRole('button', { name: LOCATION_HINT }));
    await user.press(screen.getByRole('button', { name: '계속' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      { input: NO_LOCATION_ANSWER.input, location: ON_CAMPUS, clientCapabilities: SENT_CAPABILITIES },
    ]);
    expect(server.received('POST /assistant/messages')).toHaveLength(1);
    expect(card().queryByRole('button', { name: LOCATION_HINT })).toBeNull();
  });

  it('asks again only once, though the answer that comes still lacks the location', async () => {
    givePhone({ permission: 'refused', prompt: 'granted', position: ON_CAMPUS });
    server.on('POST /assistant/answers', { status: 200, body: NO_LOCATION_ANSWER });
    const user = await askOnMap(server, NO_LOCATION_REPLY);

    await user.press(card().getByRole('button', { name: LOCATION_HINT }));
    await user.press(screen.getByRole('button', { name: '계속' }));
    await pass(2000);

    expect(recalculations(server)).toHaveLength(1);
  });
});

// The review of PR 597: a recalculation would drop what was made of the answer, and its buttons would come back.
describe('board n13 made into a Quest before the location comes', () => {
  it('is asked nothing again, and its Quest stays made', async () => {
    const phone = givePhone({ permission: 'refused', position: ON_CAMPUS });
    server.on('POST /plans', { status: 201, body: MADE_ALONE });
    const user = await askOnMap(server, NO_LOCATION_REPLY);
    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: MAKE_ALONE }));
    await pass(500);
    expect(server.received('POST /plans')).toHaveLength(1);

    phone.setPermission('granted');
    await phone.comeToFront();
    await pass(2000);

    expect(recalculations(server)).toEqual([]);
    expect(screen.queryByRole('button', { name: MAKE_ALONE })).toBeNull();
  });
});

describe('a correction of board n13', () => {
  it('asks for the recalculation with no position and the reason, the permission missing', async () => {
    givePhone({ permission: 'refused' });
    server.on('POST /assistant/answers', { status: 200, body: NO_LOCATION_ANSWER });
    await askOnMap(server, NO_LOCATION_REPLY);

    await step('from', 'increment');

    const [sent] = recalculations(server);
    expect(sent).toMatchObject({ location: null, locationMissing: 'permission' });
  });
});

describe('board n15: no Timetable', () => {
  it('says the first is the nearest, and what a Timetable would add once, as the hint line over the list', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await askOnMap(server, NO_TIMETABLE_REPLY, () => layStage(390, 760));

    expect(sheetOrder()).toEqual(['meal-words', 'answer-hint-timetable', 'meal-list']);
    expect(card().getAllByText(TIMETABLE_HINT)).toHaveLength(1);
    noButtonRow();
    await pressMarker(user, PICK);
    expect(markCard().getByText('시간표가 없어 가까운 순서로 넘겨 봐요')).toBeVisible();
  });

  it('opens the Timetable from the hint line', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await askOnMap(server, NO_TIMETABLE_REPLY);

    await user.press(card().getByRole('button', { name: TIMETABLE_HINT }));
    await pass(500);

    expect(shownAddress()).toBe('/me/timetable');
  });
});

describe('without the location permission and a Timetable', () => {
  it('says two hint lines, the location first', async () => {
    givePhone({ permission: 'refused' });
    const offers = [...(NO_LOCATION_ANSWER.offers ?? []), ...(NO_TIMETABLE_ANSWER.offers ?? [])];
    const answer = { ...NO_LOCATION_ANSWER, offers, note: NO_TIMETABLE_ANSWER.note };
    await askOnMap(server, { ...NO_LOCATION_REPLY, answer });

    expect(sheetOrder()).toEqual(['meal-words', 'answer-hint-location', 'answer-hint-timetable', 'meal-list']);
    expect(card().getAllByText(TIMETABLE_HINT)).toHaveLength(1);
    noButtonRow();
  });
});

describe('an offer from a main server before P04 ticket 86', () => {
  it('is a hint line of its label, with no row of buttons', async () => {
    givePhone({ permission: 'refused' });
    const answer = {
      ...NO_LOCATION_ANSWER,
      offers: [{ kind: 'open' as const, label: '위치 켜기', screen: 'location' as const }],
    };
    const user = await askOnMap(server, { ...NO_LOCATION_REPLY, answer });

    expect(card().queryByTestId('plan-steps')).toBeNull();
    await user.press(within(card().getByTestId('answer-hint-location')).getByText('위치 켜기'));

    expect(screen.getByText(EXPLANATION)).toBeVisible();
  });
});

// A way with no button: the model’s words, the Lookup, and the note as plain words in one sheet (P04 tickets 05, 18, 55,
// and 61); raised, the card’s ✕ stands alone.
describe('board n14: off campus', () => {
  it('notes that Friends do not see the User, with the card’s ✕ alone', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const lookup = { ...LEAVE_LOOKUP_REPLY.lookup, note: N14_NOTE, actions: [] };
    await askOnMap(server, { ...LEAVE_LOOKUP_REPLY, lookup });

    // A note is plain words, wrapping, not a chip to press (P04 ticket 55).
    expect(card().getByText(N14_NOTE)).toBeOnTheScreen();
    expect(card().queryByRole('button', { name: N14_NOTE })).toBeNull();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();

    await raiseCard();

    expect(card().getByText('24동까지 걸어서 15분')).toBeVisible();
    expect(card().getByText(N14_NOTE)).toBeVisible();
    expect(card().getByRole('button', { name: '답 닫기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();
  });
});
