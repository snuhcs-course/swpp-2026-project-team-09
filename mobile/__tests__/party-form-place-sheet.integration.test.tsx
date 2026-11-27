/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer } from './support/room';
import { openAt } from './support/party';
import { answerForm, fillPublic, submit } from './support/party-form';
import { askMainServer, PHONE_NOW } from './support/server';

// 파티 만들기's place sheet as the user reviewed it on 2026-11-28 (P06 ticket 34): a row picked gets ✓ and the
// '선택' line, and only 이 장소로 정하기 sets the place and drops the keyboard; the rows end with 지도에서 직접 고르기
// and 이름만 쓰기; the kind of each place is one grey tag, 학교 건물, 지도 위치 or 이름만, which the ? explains.

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

const ENGINEERING_1 = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };
const ENGINEERING_2 = { id: 'p302', number: '302', name: '제2공학관', latitude: 37.44885, longitude: 126.95252 };
const PLACES = [ENGINEERING_1, ENGINEERING_2];
const CONFIRM = '이 장소로 정하기';
const TYPED_LINE = '지도에 없거나 더 구체적인 곳(카페, 301동 203호 등)';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerForm(server);
  server.on('GET /places', { status: 200, body: PLACES });
  server.on('GET /places/search', ({ query }) => ({
    status: 200,
    body: PLACES.filter(({ name }) => name.includes(query.q ?? '')),
  }));
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openAt>>;

function placeRow(): ReturnType<typeof within> {
  return within(screen.getByTestId('place-row'));
}

function choice(): ReturnType<typeof screen.getByTestId> {
  return screen.getByTestId('place-choice');
}

// The place sheet with the words typed into its search, once the search, asked after the typing stops, has answered.
async function searchPlace(user: User, words: string): Promise<void> {
  await user.press(screen.getByRole('button', { name: /^어디서 /u }));
  await user.type(screen.getByLabelText('장소 검색'), words);
  await pass(500);
  await pass(500);
}

describe('a building of the list', () => {
  it('is marked and named on the 선택 line when pressed, and set, with the keyboard down, only by 이 장소로 정하기', async () => {
    const dismissed = jest.spyOn(Keyboard, 'dismiss');
    const user = await openAt('/party-form');
    await fillPublic(user);

    await searchPlace(user, '공학');
    expect(screen.getByRole('header', { name: '장소' })).toBeVisible();
    expect(screen.getByRole('button', { name: '제1공학관 301동' })).toBeVisible();
    expect(screen.getByRole('button', { name: '지도에서 직접 고르기' })).toBeVisible();
    expect(screen.getByRole('button', { name: '‘공학’ 이름만 쓰기' })).toBeVisible();
    expect(screen.getByText(TYPED_LINE)).toBeVisible();
    expect(screen.queryByTestId('place-choice')).toBeNull();
    expect(screen.getByRole('button', { name: CONFIRM })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: '제2공학관 302동' }));
    expect(screen.getByLabelText('장소 검색')).toBeVisible();
    expect(screen.getByRole('button', { name: '제2공학관 302동' })).toBeSelected();
    expect(screen.getByRole('button', { name: '제1공학관 301동' })).not.toBeSelected();
    expect(choice()).toHaveTextContent('선택제2공학관 302동학교 건물');
    dismissed.mockClear();
    await user.press(screen.getByRole('button', { name: CONFIRM }));

    expect(dismissed).toHaveBeenCalled();
    expect(screen.queryByLabelText('장소 검색')).toBeNull();
    expect(screen.getByRole('button', { name: '어디서 제2공학관 302동' })).toBeVisible();
    expect(placeRow().getByText('학교 건물')).toBeVisible();
    await user.press(submit('파티 올리기'));
    await pass(500);
    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({ subQuest: { place: { placeId: 'p302' } } });
  });
});

describe('words not of the list', () => {
  it.each([
    ['공학관 앞 벤치', '이름만', { label: '공학관 앞 벤치' }],
    ['301동', '학교 건물', { placeId: 'p301' }],
  ])('keeps %j with 이름만 쓰기, tagged %j, and sends it as before', async (words, tag, place) => {
    const user = await openAt('/party-form');
    await fillPublic(user);

    await searchPlace(user, words);
    await user.press(screen.getByRole('button', { name: `‘${words}’ 이름만 쓰기` }));
    await pass(500);
    expect(screen.getByRole('button', { name: `‘${words}’ 이름만 쓰기` })).toBeSelected();
    expect(choice()).toHaveTextContent(`선택${words}${tag}`);
    await user.press(screen.getByRole('button', { name: CONFIRM }));

    expect(screen.getByRole('button', { name: `어디서 ${words}` })).toBeVisible();
    expect(placeRow().getByText(tag)).toBeVisible();
    expect(screen.queryByText('지도·도보 시간·도착 알림에 쓰이지 않아요')).toBeNull();
    await user.press(submit('파티 올리기'));
    await pass(500);
    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({ subQuest: { place } });
  });
});

describe('a place picked on the map', () => {
  it.each([
    ['near', '제1공학관 근처', '지도 위치'],
    ['inside', '제1공학관 301동', '학교 건물'],
  ] as const)('comes back to the sheet chosen, %s a building: %j, tagged %j', async (relation, words, tag) => {
    server.on('GET /places/at', { status: 200, body: { place: ENGINEERING_1, relation } });
    const user = await openAt('/party-form');
    await fillPublic(user);

    await user.press(screen.getByRole('button', { name: '어디서 장소 검색' }));
    await user.press(screen.getByRole('button', { name: '지도에서 직접 고르기' }));
    await pass(500);
    expect(shownAddress()).toBe('/place-map');
    await answer(user, '이 위치로 정하기');

    expect(screen.getByRole('button', { name: `${words} · 지도에서 고른 위치 · 다시 고르기` })).toBeSelected();
    expect(choice()).toHaveTextContent(`선택${words}${tag}`);
    await user.press(screen.getByRole('button', { name: CONFIRM }));
    expect(screen.getByRole('button', { name: `어디서 ${words}` })).toBeVisible();
    expect(placeRow().getByText(tag)).toBeVisible();
    await user.press(submit('파티 올리기'));
    await pass(500);
    const sent = relation === 'inside' ? { placeId: 'p301' } : { label: words };
    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({ subQuest: { place: sent } });
  });
});

describe('the ? beside 장소', () => {
  it('opens the dark bubble of the three kinds, and a press anywhere closes it', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '어디서 장소 검색' }));

    await user.press(screen.getByRole('button', { name: '장소 종류 도움말' }));

    const bubble = within(screen.getByTestId('help-bubble'));
    expect(bubble.getByText('장소 종류')).toBeVisible();
    expect(bubble.getByText('학교 건물에서 만날 때. 지도에서 찍어도 돼요')).toBeVisible();
    expect(bubble.getByText('건물이 아닌 곳에서 만날 때 (정문, 잔디밭 등)')).toBeVisible();
    expect(bubble.getByText('지도에 없거나 더 구체적인 곳 (카페, 301동 203호 등)')).toBeVisible();
    expect(bubble.getByText('이름만은 지도·도보 시간·도착 알림에 쓰이지 않아요')).toBeVisible();
    for (const tag of ['학교 건물', '지도 위치', '이름만']) {
      expect(bubble.getByText(tag)).toBeVisible();
    }
    await user.press(screen.getByLabelText('장소 종류 도움말 닫기'));
    expect(screen.queryByTestId('help-bubble')).toBeNull();
  });
});
