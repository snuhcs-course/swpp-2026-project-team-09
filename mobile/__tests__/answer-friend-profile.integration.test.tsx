/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import type { Friend } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, shownAddress } from './support/app';
import { askOnMap, card, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { holdBackButton } from './support/back';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT, layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';

// A Friend's profile card inside the answer frame (P02 ticket 18), over the stored answer to "배고파, 민수랑 같이" and
// the fake main server's Friends: 김민준, seen at the exact position, and 서지우, of whom the User sees the Timetable
// only. It opens from the card of a face of the Plan's people (P04 ticket 03) and from a cell's mark in the open list
// of Friends, stands over the answer's card, and closes back to it.

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

const ASKER = MEAL_ANSWER.input.people[0];
const ADD = '같이 먹을 친구 추가';
const JI_WOO_CELL = '서지우, 경영학과, 위치 모름, 추가';
const PICK = '302동식당 · 12:15 점심';
// 김민준's face on the Plan, named apart from his Avatar on the everyday map.
const FACE = '민준';

// 김민준 with the two fields package C adds to GET /friends: the mock's Friend ID of 김민준 (`FRIEND_IDS.f1`) and the
// start of the friendship that ticket 18 names, 3 October.
const MIN_JUN_PROFILED: Friend = { ...MIN_JUN, friendId: 'KM4J8QZA', friendsSince: '2026-10-03T14:05:00+09:00' };

// The stored reply with its second person changed to 김민준, a Friend of the fake server, in the conditions, on the
// chip, which the main server writes with the Friend's full name, and in each Plan's people and faces.
function replyWithMinJun(): typeof MEAL_ANSWER_REPLY {
  const [asker, minsu] = MEAL_ANSWER.input.people;
  if (asker === undefined || minsu === undefined) {
    throw new Error('The stored answer has no second person');
  }
  const input = { ...MEAL_ANSWER.input, people: [asker, { ...minsu, userId: MIN_JUN.id }] };
  const chips = MEAL_ANSWER.chips.map((chip) =>
    chip.userId === minsu.userId ? { ...chip, text: MIN_JUN.name, userId: MIN_JUN.id } : chip,
  );
  const swapped = <T extends { userId: string; name: string }>(person: T): T =>
    person.userId === minsu.userId ? { ...person, userId: MIN_JUN.id, name: FACE } : person;
  const plans = MEAL_ANSWER.plans.map((plan) => ({
    ...plan,
    parts: plan.parts.map(swapped),
    scene: {
      ...plan.scene,
      people: plan.scene.people.map((face) => {
        const changed = swapped(face);
        return changed === face ? face : { ...changed, tag: FACE };
      }),
    },
  }));
  return { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER, input, chips, plans } };
}

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /friends', { status: 200, body: [MIN_JUN_PROFILED, JI_WOO] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function profileCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

function markCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('mark-card'));
}

type User = Awaited<ReturnType<typeof askOnMap>>;

// Asks with 김민준 in the Plan, and opens the card of his face.
async function askWithMinJun(): Promise<User> {
  const user = await askOnMap(server, replyWithMinJun(), () => layStage(390, 760));
  await pressMarker(user, FACE);
  return user;
}

// The Plan on the map as it was asked, with 김민준's face.
function planKept(): void {
  expect(mapThings()).toEqual(expect.arrayContaining([PICK, FACE]));
  expect(screen.getByTestId('answer-pill')).toBeVisible();
}

function withoutMinJun(): object {
  return {
    input: { ...replyWithMinJun().answer.input, people: [ASKER] },
    location: ON_CAMPUS,
    clientCapabilities: SENT_CAPABILITIES,
  };
}

// Partitions: opened and closed by its ✕ and by Android's back button; 빼기 beside it.
describe("the profile of a face of an answer's Plan", () => {
  it('opens the profile over the answer card, asks nothing, and its ✕ brings the answer back as it was', async () => {
    const user = await askWithMinJun();

    await user.press(markCard().getByRole('button', { name: `${FACE} 프로필` }));

    expect(profileCard().getByRole('header', { name: '김민준' })).toBeVisible();
    expect(profileCard().getByText('컴퓨터공학부')).toBeVisible();
    expect(profileCard().getByRole('button', { name: '어디까지 보이나' })).toHaveTextContent('정확한 위치까지 보여요');
    expect(profileCard().getByText('친구 ID KM4J8QZA')).toBeVisible();
    expect(profileCard().getByText('10월 3일부터 친구')).toBeVisible();
    expect(screen.getByTestId('answer-card')).toBeVisible();
    expect(recalculations(server)).toEqual([]);

    await user.press(profileCard().getByRole('button', { name: '닫기' }));

    expect(screen.queryByTestId('map-card')).toBeNull();
    expect(screen.getByTestId('answer-card')).toBeVisible();
    planKept();
    await pressMarker(user, FACE);
    expect(markCard().getByRole('button', { name: `${FACE} 프로필` })).toBeVisible();
  });

  it("is closed by Android's back button, which leaves the answer on screen", async () => {
    const back = holdBackButton();
    const user = await askWithMinJun();
    await user.press(markCard().getByRole('button', { name: `${FACE} 프로필` }));
    expect(profileCard().getByRole('header', { name: '김민준' })).toBeVisible();

    expect(await back()).toBe(true);

    expect(screen.queryByTestId('map-card')).toBeNull();
    planKept();
  });

  it('keeps 빼기 beside the profile, which still takes the person out', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_ALONE });
    const user = await askWithMinJun();

    await user.press(markCard().getByRole('button', { name: `${FACE} 빼기` }));
    await pass(500);

    expect(recalculations(server)).toEqual([withoutMinJun()]);
    expect(mapThings()).not.toContain(FACE);
  });
});

// Partitions: the way back from a screen the profile pushed, Android's back button and the screen's own 뒤로; then
// the back button over the profile. The rule: decision 13, one handler owns the back button while a profile is open.
describe('a screen pushed from the profile', () => {
  it.each([
    ["Android's back button", 'android'],
    ["the screen's 뒤로", 'screen'],
  ])(
    'returns by %s to the profile over the answer, and the back button then closes the profile alone',
    async (_, way) => {
      const back = holdBackButton();
      const user = await askWithMinJun();
      await user.press(markCard().getByRole('button', { name: `${FACE} 프로필` }));
      await user.press(profileCard().getByRole('button', { name: '어디까지 보이나' }));
      await pass(500);
      expect(shownAddress()).toBe('/me/location-sharing');

      if (way === 'android') {
        expect(await back()).toBe(true);
      } else {
        await user.press(screen.getByRole('button', { name: '뒤로' }));
      }
      await pass(500);

      expect(shownAddress()).toBe('/main');
      expect(profileCard().getByRole('header', { name: '김민준' })).toBeVisible();
      expect(await back()).toBe(true);
      expect(screen.queryByTestId('map-card')).toBeNull();
      planKept();
    },
  );
});

// Partitions: words sent while the profile gives way to the keyboard, answered with another answer. The rule:
// decision 14, the profile belongs to the reply it was opened over.
describe('a new reply', () => {
  it('closes the profile opened over the answer before it', async () => {
    const user = await askWithMinJun();
    await user.press(markCard().getByRole('button', { name: `${FACE} 프로필` }));
    server.on('POST /assistant/messages', { status: 200, body: { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_THREE } });

    await showKeyboard(KEYBOARD);
    await user.type(screen.getByLabelText(AI_INPUT), '지은이도 불러 줘');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await hideKeyboard();
    await pass(500);

    expect(mapThings()).toContain('학생회관식당 · 12:33 점심');
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

// Partitions: a Friend of whom the User sees the Timetable only, from the open list, which stays open.
describe("a cell's mark in the open list of Friends", () => {
  it('opens the profile without choosing, and closing returns to the open list', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: ADD }));

    await user.press(card().getByRole('button', { name: '서지우 프로필' }));

    expect(profileCard().getByRole('header', { name: '서지우' })).toBeVisible();
    expect(profileCard().getByText('경영학과')).toBeVisible();
    expect(profileCard().getByRole('button', { name: '어디까지 보이나' })).toHaveTextContent('시간표만 보여요');
    expect(recalculations(server)).toEqual([]);

    await user.press(profileCard().getByRole('button', { name: '닫기' }));

    expect(screen.queryByTestId('map-card')).toBeNull();
    expect(card().getByRole('button', { name: JI_WOO_CELL })).toBeEnabled();
    expect(card().getByRole('button', { name: '그대로' })).toBeVisible();
    expect(card().getByText('누구와 같이 먹을까요?')).toBeVisible();
  });
});

// Partitions: the cells; the face of the stored answer's person, who is none of the User's Friends.
describe('full names', () => {
  it('are in the cells with the department under each, and a face opens the profile only of a Friend', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => layStage(390, 760));

    await pressMarker(user, '민수');
    expect(markCard().getByRole('button', { name: '민수 빼기' })).toBeVisible();
    expect(markCard().queryByRole('button', { name: '민수 프로필' })).toBeNull();
    await press(user, '카드 닫기');
    await pass(100);
    await user.press(card().getByRole('button', { name: ADD }));

    expect(card().getByRole('button', { name: '김민준, 컴퓨터공학부, 1.2km, 추가' })).toHaveTextContent(
      '김민준컴퓨터공학부1.2km',
    );
    expect(card().getByRole('button', { name: JI_WOO_CELL })).toHaveTextContent('서지우경영학과위치 모름');
  });
});
