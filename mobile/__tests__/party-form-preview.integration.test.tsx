/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { CAREER, MY_CAREER, pickEvent } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { MIN_JUN_HOLDER, answer } from './support/room';
import { openAt } from './support/party';
import { answerForm, FESTIVAL, fillPublic, pressTimes, submit } from './support/party-form';
import { askMainServer, PHONE_NOW } from './support/server';

// 파티 만들기 as a preview of its 모집글 (P06 ticket 34): the title and the text typed in place, the box of the time, the
// place and the event, the place sheet's building search, '파티 설정' changed in place, the required marks and the
// event's sheet, against the fake main server.

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
const HIDDEN = { includeHiddenElements: true };

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

function placeRow(): ReturnType<typeof within> {
  return within(screen.getByTestId('place-row'));
}

// The place sheet with the words typed into its search, once the search, asked after the typing stops, has answered.
async function searchPlace(user: Awaited<ReturnType<typeof openAt>>, words: string): Promise<void> {
  await user.press(screen.getByRole('button', { name: /^어디서 /u }));
  await user.type(screen.getByLabelText('장소 검색'), words);
  await pass(500);
  await pass(500);
}

describe('the preview', () => {
  it('opens as the 모집글 it makes: the title and the text typed in place, the poster, the box and 파티 설정', async () => {
    const user = await openAt('/party-form');

    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
    // The placeholders are drawn under the empty fields, with a red asterisk, and read by the fields themselves.
    expect(screen.getByText(/^제목을 입력하세요/u, HIDDEN)).toHaveTextContent('제목을 입력하세요 *');
    expect(screen.getByText(/^어떤 파티인지 소개해 주세요/u, HIDDEN)).toHaveTextContent(
      '어떤 파티인지 소개해 주세요 *',
    );
    expect(screen.getByPlaceholderText('제목을 입력하세요')).toBe(screen.getByLabelText('제목'));
    const poster = within(screen.getByTestId('poster'));
    expect(poster.getByText('홍길동')).toBeVisible();
    expect(poster.getByText('컴퓨터공학부')).toBeVisible();
    expect(screen.queryByText('방금')).toBeNull();
    const box = within(screen.getByTestId('plan-box'));
    expect(box.getByRole('button', { name: '언제 날짜·시간 선택' })).toBeVisible();
    expect(box.getByText('날짜·시간 선택')).toBeVisible();
    expect(box.getByRole('button', { name: '어디서 장소 검색' })).toBeVisible();
    expect(box.getByRole('button', { name: '관련 행사 고르기' })).toBeVisible();
    for (const label of ['언제', '어디서', '관련 행사', '제목', '본문', '사진', '태그']) {
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.queryByRole('button', { name: '카메라' })).toBeNull();
    expect(screen.getByText('파티 설정')).toBeVisible();

    await user.type(screen.getByLabelText('제목'), '버들골 저녁 러닝');
    await user.type(screen.getByLabelText('본문'), '천천히 뛰어요');

    expect(screen.getByLabelText('제목')).toHaveDisplayValue('버들골 저녁 러닝');
    expect(screen.getByLabelText('본문')).toHaveDisplayValue('천천히 뛰어요');
    expect(screen.queryByText(/^제목을 입력하세요/u, HIDDEN)).toBeNull();
    expect(screen.queryByRole('button', { name: '확인' })).toBeNull();
  });
});

describe('the place sheet', () => {
  it('lists the buildings matching the words, and a building picked is sent as itself with 건물', async () => {
    const user = await openAt('/party-form');
    await fillPublic(user);

    await searchPlace(user, '공학');

    expect(screen.getByRole('button', { name: '제1공학관 301동' })).toBeVisible();
    expect(screen.getByRole('button', { name: '‘공학’ 그대로 쓰기' })).toBeVisible();
    expect(screen.getByText('건물 목록에 없는 장소')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '제2공학관 302동' }));

    expect(screen.queryByLabelText('장소 검색')).toBeNull();
    expect(screen.getByRole('button', { name: '어디서 제2공학관 302동' })).toBeVisible();
    expect(placeRow().getByText('건물')).toBeVisible();
    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({ subQuest: { place: { placeId: 'p302' } } });
  });
});

describe('a place not of the list', () => {
  it.each([
    ['공학관 앞 벤치', '직접 입력', { label: '공학관 앞 벤치' }],
    ['301동', '건물', { placeId: 'p301' }],
  ])('keeps %j as typed, marked %j, and sends it as before', async (words, badge, place) => {
    const user = await openAt('/party-form');
    await fillPublic(user);

    await searchPlace(user, words);
    await user.press(screen.getByRole('button', { name: `‘${words}’ 그대로 쓰기` }));
    await pass(500);

    expect(screen.getByRole('button', { name: `어디서 ${words}` })).toBeVisible();
    expect(placeRow().getByText(badge)).toBeVisible();
    const line = '지도·도보 시간·도착 알림에 쓰이지 않아요';
    expect(placeRow().queryByText(line) !== null).toBe(badge === '직접 입력');
    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({ subQuest: { place } });
  });

  it('picks a point on the map with 지도에서 고르기, marked 지도', async () => {
    server.on('GET /places/at', { status: 200, body: { place: ENGINEERING_1, relation: 'near' } });
    const user = await openAt('/party-form');
    await fillPublic(user);

    await user.press(screen.getByRole('button', { name: '어디서 장소 검색' }));
    await user.press(screen.getByRole('button', { name: '지도에서 고르기' }));
    await pass(500);
    expect(shownAddress()).toBe('/place-map');
    await answer(user, '이 위치로 정하기');

    expect(screen.getByRole('button', { name: '어디서 제1공학관 근처' })).toBeVisible();
    expect(placeRow().getByText('지도')).toBeVisible();
    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({
      subQuest: { place: { label: '제1공학관 근처' } },
    });
  });
});

describe('파티 설정', () => {
  it('changes 인원, 공개 범위, 참여 방식 and 게시판 in place, and 비공개 hides 참여 방식 and 게시판', async () => {
    const user = await openAt('/party-form');

    await pressTimes(user, '인원 줄이기', 2);
    expect(screen.getByText('2명')).toBeVisible();
    expect(screen.getByRole('button', { name: '인원 줄이기' })).toBeDisabled();
    expect(screen.getByText('공개 파티는 2명부터예요')).toBeVisible();
    expect(screen.getByRole('radio', { name: '공개' })).toBeChecked();
    await user.press(screen.getByRole('radio', { name: '승인 후 참여' }));
    await user.press(screen.getByRole('radio', { name: '취미 게시판' }));
    expect(screen.getByRole('radio', { name: '승인 후 참여' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '취미 게시판' })).toBeChecked();

    await user.press(screen.getByRole('radio', { name: '비공개' }));
    expect(screen.queryByText('참여 방식')).toBeNull();
    expect(screen.queryByRole('radio', { name: '취미 게시판' })).toBeNull();
    expect(screen.queryByText('공개 파티는 2명부터예요')).toBeNull();

    await user.press(screen.getByRole('radio', { name: '공개' }));
    expect(screen.getByRole('radio', { name: '승인 후 참여' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '취미 게시판' })).toBeChecked();
  });

  it('opens 친구 초대 as a sheet, whose button invites the Friends chosen', async () => {
    const user = await openAt('/party-form');

    await user.press(screen.getByRole('button', { name: '친구 초대 고르기' }));
    expect(screen.getByLabelText('친구 검색')).toBeVisible();
    expect(screen.getByText('남은 자리 3명까지 초대할 수 있어요')).toBeVisible();
    expect(screen.getByRole('button', { name: '완료' })).toBeVisible();
    await user.press(screen.getByRole('checkbox', { name: MIN_JUN_HOLDER.name }));
    await user.press(screen.getByRole('button', { name: '1명 초대' }));

    expect(screen.queryByLabelText('친구 검색')).toBeNull();
    expect(screen.getByRole('button', { name: `친구 초대 ${MIN_JUN_HOLDER.name}` })).toBeVisible();
    await user.press(screen.getByRole('radio', { name: '비공개' }));
    await pressTimes(user, '인원 줄이기', 2);
    expect(screen.getByText('2명')).toBeVisible();
    expect(screen.getByText('나와 초대한 친구를 포함해요')).toBeVisible();
  });
});

describe('the required fields', () => {
  it('leaves 파티 올리기 pressable, marks each empty one with its line and sends nothing', async () => {
    const user = await openAt('/party-form');

    expect(submit('파티 올리기')).toBeEnabled();
    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests/own')).toEqual([]);
    expect(screen.getByText('제목을 입력해 주세요')).toBeVisible();
    expect(screen.getByText('본문을 입력해 주세요')).toBeVisible();
    expect(screen.getByText('게시판을 골라 주세요')).toBeVisible();
    expect(screen.getByTestId('title-box')).toHaveStyle({ borderColor: color.danger });

    await user.type(screen.getByLabelText('제목'), '보드게임');
    expect(screen.queryByText('제목을 입력해 주세요')).toBeNull();
    expect(screen.getByTestId('title-box')).not.toHaveStyle({ borderColor: color.danger });
    expect(screen.getByText('본문을 입력해 주세요')).toBeVisible();
  });

  it('marks the Friends to invite under 비공개, and neither the text nor the board', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('radio', { name: '비공개' }));
    await user.type(screen.getByLabelText('제목'), '저녁 같이');

    await user.press(submit('파티 만들기'));
    await pass(500);

    expect(server.received('POST /quests/own')).toEqual([]);
    expect(screen.getByText('초대할 친구를 골라 주세요')).toBeVisible();
    expect(screen.queryByText('본문을 입력해 주세요')).toBeNull();
    expect(screen.queryByText('게시판을 골라 주세요')).toBeNull();
  });
});

describe('관련 행사', () => {
  it('leaves the title empty when an event is picked, and the chosen event’s sheet offers 행사 빼기', async () => {
    const user = await openAt('/party-form');

    await user.press(screen.getByRole('button', { name: '관련 행사 고르기' }));
    await pickEvent(user, FESTIVAL);

    expect(screen.getByLabelText('제목')).toHaveDisplayValue('');
    expect(screen.getByRole('button', { name: `관련 행사 ${FESTIVAL.title}` })).toBeVisible();
    expect(screen.getByRole('button', { name: '어디서 버들골 풍산마당' })).toBeVisible();
    expect(screen.getByRole('button', { name: /^언제 10월 9일/u })).toBeVisible();

    await user.press(screen.getByRole('button', { name: `관련 행사 ${FESTIVAL.title}` }));
    await user.press(screen.getByRole('button', { name: `행사 · ${FESTIVAL.title}` }));
    expect(screen.queryByRole('button', { name: '선택됨' })).toBeNull();
    await user.press(screen.getByRole('button', { name: '행사 빼기' }));

    expect(screen.getByRole('button', { name: '관련 행사 고르기' })).toBeVisible();
    expect(screen.getByRole('button', { name: '언제 날짜·시간 선택' })).toBeVisible();
    expect(screen.getByRole('button', { name: '어디서 장소 검색' })).toBeVisible();
  });

  it('locks the event row of an edit, with no way to the picker', async () => {
    server.on(`GET /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
    await openAt(`/party-form?questId=${MY_CAREER.id}`);

    expect(within(screen.getByTestId('plan-box')).getByText(CAREER.title)).toBeVisible();
    expect(screen.getByLabelText('바꿀 수 없어요')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^관련 행사/u })).toBeNull();
  });
});
