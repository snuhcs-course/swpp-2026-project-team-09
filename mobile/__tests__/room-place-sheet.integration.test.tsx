/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import type { Quest, SubQuest } from '@/api/types';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { searchPlace, setPlace } from './support/party-form';
import { answer, answerRoom, openRoom, PICNIC } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// The room's 일정 form sets 어디서 with the 파티 form's place sheet (P06 ticket 41): a row of the place's words and the
// grey tag of its kind opens the sheet, and what 이 장소로 정하기 sets is what 추가 and 수정 send.

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

function step(index: number): SubQuest {
  const found = PICNIC.subQuests[index];
  if (found === undefined) {
    throw new Error(`No Sub Quest ${String(index)}`);
  }
  return found;
}

// 301동 앞, a point picked on the map, and 자하연, a Place of the list.
const MEET = step(0);
const PICNIC_STEP = step(1);
const STATION = { placeId: null, label: '서울대입구역', latitude: null, longitude: null };
// The same Quest, its first step's place words alone.
const TYPED: Quest = { ...PICNIC, subQuests: [{ ...MEET, place: STATION }, PICNIC_STEP] };
const STEPS = `/quests/${PICNIC.id}/sub-quests`;
const ENGINEERING_1 = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };
const ENGINEERING_2 = { id: 'p302', number: '302', name: '제2공학관', latitude: 37.44885, longitude: 126.95252 };
const PLACES = [ENGINEERING_1, ENGINEERING_2];
const CONFIRM = '이 장소로 정하기';
// 확인 on the date·time sheet keeps its first time, today 19:00.
const STARTS_AT = '2026-10-06T10:00:00.000Z';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  server.on('GET /places', { status: 200, body: PLACES });
  server.on(`POST ${STEPS}`, { status: 201, body: MEET });
  server.on(`PUT ${STEPS}/${MEET.id}`, { status: 200, body: MEET });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openRoom>>;

function placeRow(): ReturnType<typeof within> {
  return within(screen.getByTestId('place-row'));
}

// The form for a new Sub Quest, its content and time given.
async function openAdd(): Promise<User> {
  const user = await openRoom();
  await user.press(screen.getByRole('button', { name: '일정 추가' }));
  await user.type(screen.getByLabelText('내용'), '모이기');
  await user.press(screen.getByRole('button', { name: '언제 날짜·시간 선택' }));
  await answer(user, '확인');
  return user;
}

// The form of the Quest's step at `index`.
async function openEdit(index: number, quest = PICNIC): Promise<User> {
  answerRoom(server, quest);
  const user = await openRoom(quest);
  await user.press(screen.getAllByRole('button', { name: '일정 수정' })[index]);
  await pass(500);
  return user;
}

function added(): unknown[] {
  return server.received(`POST ${STEPS}`).map(({ body }) => body);
}

function edited(): unknown[] {
  return server.received(`PUT ${STEPS}/${MEET.id}`).map(({ body }) => body);
}

describe('어디서 in the room’s 일정 form', () => {
  it('is a row of 장소 검색 in grey, which drops the keyboard and opens the place sheet and its ? over the room', async () => {
    const sheetShownWhenDismissed: boolean[] = [];
    const user = await openAdd();
    expect(placeRow().getByText('장소 검색')).toHaveStyle({ color: color.inkSubtle });
    expect(screen.queryByPlaceholderText('직접 입력')).toBeNull();
    expect(screen.queryByRole('button', { name: '지도에서 선택' })).toBeNull();
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {
      sheetShownWhenDismissed.push(screen.queryByRole('header', { name: '장소' }) !== null);
    });

    await user.press(screen.getByRole('button', { name: '어디서 장소 검색' }));

    expect(sheetShownWhenDismissed).toEqual([false]);
    expect(screen.getByRole('header', { name: '장소' })).toBeVisible();
    expect(screen.getByLabelText('장소 검색')).toBeVisible();
    expect(screen.getByRole('button', { name: '지도에서 직접 고르기' })).toBeVisible();
    expect(screen.getByRole('button', { name: CONFIRM })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: '장소 종류 도움말' }));
    expect(within(screen.getByTestId('help-bubble')).getByText('장소 종류')).toBeVisible();
  });

  it('opens a sheet that stands above the keyboard, as on the 파티 form', async () => {
    const user = await openAdd();
    await user.press(screen.getByRole('button', { name: '어디서 장소 검색' }));

    await showKeyboard(KEYBOARD);
    expect(screen.getByTestId('sheet-room')).toHaveStyle({ bottom: KEYBOARD });
    expect(screen.getByLabelText('장소 검색')).toBeVisible();

    await hideKeyboard();
    expect(screen.getByTestId('sheet-room')).toHaveStyle({ bottom: 0 });
  });
});

describe('a place set with 이 장소로 정하기 on a new 일정', () => {
  it('is a building of the list, tagged 학교 건물 and added as its placeId', async () => {
    const user = await openAdd();

    await setPlace(user, '공학', '제2공학관 302동');

    expect(screen.queryByLabelText('장소 검색')).toBeNull();
    expect(screen.getByRole('button', { name: '어디서 제2공학관 302동' })).toBeVisible();
    expect(placeRow().getByText('학교 건물')).toBeVisible();
    await answer(user, '추가');
    expect(added()).toEqual([{ title: '모이기', startsAt: STARTS_AT, place: { placeId: 'p302' } }]);
  });

  it.each([
    ['공학관 앞 벤치', '이름만', { label: '공학관 앞 벤치' }],
    ['301동', '학교 건물', { placeId: 'p301' }],
  ])('is %j kept with 이름만 쓰기, tagged %j and added as before', async (words, tag, place) => {
    const user = await openAdd();

    await setPlace(user, words);
    await pass(500);

    expect(screen.getByRole('button', { name: `어디서 ${words}` })).toBeVisible();
    expect(placeRow().getByText(tag)).toBeVisible();
    await answer(user, '추가');
    expect(added()).toEqual([{ title: '모이기', startsAt: STARTS_AT, place }]);
  });
});

describe('a point picked on the map from the place sheet', () => {
  it.each([
    ['near', '제1공학관 근처', '지도 위치'],
    ['inside', '제1공학관 301동', '학교 건물'],
  ] as const)('is set chosen %s a building, %j, tagged %j, and added as before', async (relation, words, tag) => {
    server.on('GET /places/at', { status: 200, body: { place: ENGINEERING_1, relation } });
    const user = await openAdd();

    await user.press(screen.getByRole('button', { name: '어디서 장소 검색' }));
    await user.press(screen.getByRole('button', { name: '지도에서 직접 고르기' }));
    await pass(500);
    expect(shownAddress()).toBe('/place-map');
    await answer(user, '이 위치로 정하기');
    expect(screen.getByRole('button', { name: `${words} · 지도에서 고른 위치 · 다시 고르기` })).toBeSelected();
    await user.press(screen.getByRole('button', { name: CONFIRM }));

    expect(screen.getByRole('button', { name: `어디서 ${words}` })).toBeVisible();
    expect(placeRow().getByText(tag)).toBeVisible();
    await answer(user, '추가');
    // The point under the pin, which the main server was asked about; inside a building, that building.
    const [{ query }] = server.received('GET /places/at');
    const point = { latitude: Number(query.latitude), longitude: Number(query.longitude), label: words };
    expect(added()).toEqual([
      { title: '모이기', startsAt: STARTS_AT, place: relation === 'inside' ? { placeId: 'p301' } : point },
    ]);
  });
});

describe('the place of a new 일정', () => {
  it('is left out when 어디서 is never set, and a set place is replaced, never removed', async () => {
    const user = await openAdd();
    await answer(user, '추가');
    expect(added()).toEqual([{ title: '모이기', startsAt: STARTS_AT }]);

    await user.press(screen.getByRole('button', { name: '일정 추가' }));
    await user.type(screen.getByLabelText('내용'), '모이기');
    await user.press(screen.getByRole('button', { name: '언제 날짜·시간 선택' }));
    await answer(user, '확인');
    await setPlace(user, '공학', '제1공학관 301동');
    await user.press(screen.getByRole('button', { name: '어디서 제1공학관 301동' }));
    await user.press(screen.getByRole('button', { name: '검색어 지우기' }));
    expect(screen.queryByRole('button', { name: /이름만 쓰기$/u })).toBeNull();
    expect(screen.getByRole('button', { name: CONFIRM })).toBeDisabled();
    await answer(user, '장소 닫기');

    expect(screen.getByRole('button', { name: '어디서 제1공학관 301동' })).toBeVisible();
    await answer(user, '추가');
    expect(added()[1]).toEqual({ title: '모이기', startsAt: STARTS_AT, place: { placeId: 'p301' } });
  });
});

describe('an edited 일정', () => {
  it.each([
    [0, PICNIC, '301동 앞', '지도 위치'],
    [1, PICNIC, '자하연', '학교 건물'],
    [0, TYPED, '서울대입구역', '이름만'],
  ] as const)(
    'shows the place of step %i with its tag, and its sheet opens on its words with nothing chosen: %#',
    async (index, quest, words, tag) => {
      const user = await openEdit(index, quest);

      expect(screen.getByRole('button', { name: `어디서 ${words}` })).toBeVisible();
      expect(placeRow().getByText(tag)).toBeVisible();
      await user.press(screen.getByRole('button', { name: `어디서 ${words}` }));
      await pass(500);
      await pass(500);

      expect(screen.getByLabelText('장소 검색')).toHaveDisplayValue(words);
      expect(screen.queryByTestId('place-choice')).toBeNull();
      expect(screen.getByRole('button', { name: CONFIRM })).toBeDisabled();
    },
  );

  it.each([
    ['제1공학관 301동', '학교 건물', { placeId: 'p301' }],
    ['‘정문 앞’ 이름만 쓰기', '이름만', { label: '정문 앞' }],
  ])('sends with 수정 the place set from the row %j, tagged %j', async (row, tag, place) => {
    const user = await openEdit(0);

    await searchPlace(user, row.startsWith('‘') ? '정문 앞' : '공학');
    await user.press(screen.getByRole('button', { name: row }));
    await user.press(screen.getByRole('button', { name: CONFIRM }));
    await pass(500);

    expect(placeRow().getByText(tag)).toBeVisible();
    await answer(user, '수정');
    expect(edited()).toEqual([{ title: MEET.title, startsAt: MEET.startsAt, place }]);
  });
});
