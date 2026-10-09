/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, answerRoom, HIS_PICNIC, openRoom, PICNIC, toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// The room's 일정: the Sub Quests, the Leader's form with the date·time sheet and the map view, against the fake main
// server.

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

const [MEET, PICNIC_STEP] = PICNIC.subQuests;
const STEPS = `/quests/${PICNIC.id}/sub-quests`;
const ENGINEERING = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };
const UUID = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function plan(): ReturnType<typeof within> {
  return within(screen.getByLabelText('일정'));
}

describe('일정', () => {
  it('lists the Sub Quests with their times and places', async () => {
    await openRoom();

    expect(screen.getAllByTestId('plan-step')).toHaveLength(2);
    for (const words of ['17:40', '301동 앞에서 만나기', '301동 앞', '18:00–20:00', '피크닉', '자하연']) {
      expect(plan().getByText(words)).toBeVisible();
    }
  });

  it('says so without a Sub Quest', async () => {
    const empty = { ...PICNIC, subQuests: [] };
    answerRoom(server, empty);

    await openRoom(empty);

    expect(plan().getByText('일정 없음')).toBeVisible();
  });

  it("marks a Sub Quest done for the User, for any Holder, and shows no Leader's control to another", async () => {
    answerRoom(server, HIS_PICNIC);
    server.on(`POST ${STEPS}/${MEET?.id}/done`, { status: 204 });
    const user = await openRoom(HIS_PICNIC);

    expect(screen.queryByRole('button', { name: '일정 추가' })).toBeNull();
    expect(screen.queryByRole('button', { name: '일정 수정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '일정 삭제' })).toBeNull();
    await user.press(screen.getAllByRole('button', { name: '완료로 표시' })[0]);
    await pass(500);

    expect(server.received(`POST ${STEPS}/${MEET?.id}/done`)).toHaveLength(1);
  });
});

describe("the Leader's 일정 form, adding", () => {
  it('adds a Sub Quest with the date·time sheet and the map view, keeping its key for a retry', async () => {
    let first = true;
    server.on('GET /places/at', { status: 200, body: { place: ENGINEERING, relation: 'inside' } });
    server.on(`POST ${STEPS}`, () => {
      const reply = first ? ('no-answer' as const) : { status: 201, body: MEET };
      first = false;
      return reply;
    });
    const user = await openRoom();

    await user.press(screen.getByRole('button', { name: '일정 추가' }));
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled();
    await user.type(screen.getByLabelText('내용'), '카페에서 쉬기');
    await user.press(screen.getByRole('button', { name: '언제 날짜·시간 선택' }));
    expect(screen.getByText('오늘 19:00')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '내일 7' }));
    await user.press(screen.getByRole('button', { name: '20시' }));
    await user.press(screen.getByRole('button', { name: '30분' }));
    await answer(user, '확인');
    expect(screen.getByRole('button', { name: '언제 내일 20:30' })).toBeVisible();

    await user.press(screen.getByRole('button', { name: '지도에서 선택' }));
    await pass(500);
    expect(shownAddress()).toBe('/place-map');
    expect(screen.getByText('지도를 움직여 핀에 맞추기')).toBeVisible();
    expect(screen.getByText('제1공학관 301동')).toBeVisible();
    expect(screen.getByText('건물 위치예요')).toBeVisible();
    await answer(user, '이 위치로 정하기');
    expect(screen.getByDisplayValue('제1공학관 301동')).toBeVisible();

    await answer(user, '추가');
    expect(toast()).toHaveTextContent('요청하지 못했어요. 다시 시도해 주세요');
    await answer(user, '추가');

    const sent = server.received(`POST ${STEPS}`);
    expect(sent.map(({ body }) => body)).toEqual([
      { title: '카페에서 쉬기', startsAt: '2026-10-07T11:30:00.000Z', place: { placeId: 'p301' } },
      { title: '카페에서 쉬기', startsAt: '2026-10-07T11:30:00.000Z', place: { placeId: 'p301' } },
    ]);
    expect(sent[0]?.idempotencyKey).toMatch(UUID);
    expect(sent[1]?.idempotencyKey).toBe(sent[0]?.idempotencyKey);
    expect(screen.queryByLabelText('내용')).toBeNull();
  });
});

describe("the Leader's 일정 form, 언제", () => {
  it('closes the keyboard before the time sheet of 언제 opens', async () => {
    const sheetShownWhenDismissed: boolean[] = [];
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {
      sheetShownWhenDismissed.push(screen.queryByRole('button', { name: '확인' }) !== null);
    });
    const user = await openRoom();
    await user.press(screen.getByRole('button', { name: '일정 추가' }));
    await user.type(screen.getByLabelText('내용'), '카페에서 쉬기');

    await user.press(screen.getByRole('button', { name: '언제 날짜·시간 선택' }));

    expect(sheetShownWhenDismissed).toEqual([false]);
    expect(screen.getByText('오늘 19:00')).toBeVisible();
  });
});

describe('the map view', () => {
  it('names a point near a Place after it, and sends it as a point', async () => {
    server.on('GET /places/at', { status: 200, body: { place: ENGINEERING, relation: 'near' } });
    server.on(`POST ${STEPS}`, { status: 201, body: MEET });
    const user = await openRoom();
    await user.press(screen.getByRole('button', { name: '일정 추가' }));
    await user.type(screen.getByLabelText('내용'), '모이기');
    await user.press(screen.getByRole('button', { name: '언제 날짜·시간 선택' }));
    await answer(user, '확인');

    await user.press(screen.getByRole('button', { name: '지도에서 선택' }));
    await pass(500);
    expect(screen.getByText('직접 찍은 위치 · 가장 가까운 건물 기준')).toBeVisible();
    await answer(user, '이 위치로 정하기');
    await answer(user, '추가');

    // The point under the pin, which the main server was asked about.
    const [{ query }] = server.received('GET /places/at');
    expect(server.received(`POST ${STEPS}`).map(({ body }) => body)).toEqual([
      {
        title: '모이기',
        startsAt: '2026-10-06T10:00:00.000Z',
        place: { latitude: Number(query.latitude), longitude: Number(query.longitude), label: '제1공학관 근처' },
      },
    ]);
  });
});

describe("the Leader's 일정 form, editing and cancelling", () => {
  it('edits a Sub Quest', async () => {
    server.on(`PUT ${STEPS}/${MEET?.id}`, { status: 200, body: MEET });
    const user = await openRoom();

    await user.press(screen.getAllByRole('button', { name: '일정 수정' })[0]);
    expect(screen.getByDisplayValue('301동 앞에서 만나기')).toBeVisible();
    await user.clear(screen.getByLabelText('내용'));
    await user.type(screen.getByLabelText('내용'), '301동 로비');
    await answer(user, '수정');

    expect(server.received(`PUT ${STEPS}/${MEET?.id}`).map(({ body }) => body)).toEqual([
      {
        title: '301동 로비',
        startsAt: MEET?.startsAt,
        place: { latitude: 37.45091, longitude: 126.95289, label: '301동 앞' },
      },
    ]);
  });

  it('cancels a Sub Quest after the dialog', async () => {
    server.on(`DELETE ${STEPS}/${PICNIC_STEP?.id}`, { status: 204 });
    const user = await openRoom();

    await user.press(screen.getAllByRole('button', { name: '일정 삭제' })[1]);
    expect(screen.getByRole('header', { name: '일정을 삭제할까요?' })).toBeVisible();
    await answer(user, '삭제');

    expect(server.received(`DELETE ${STEPS}/${PICNIC_STEP?.id}`)).toHaveLength(1);
  });
});

describe('a refused change of 일정', () => {
  it.each([
    [refusal(409, 'LAST_SUB_QUEST'), '일정이 하나뿐이라 삭제할 수 없어요'],
    [refusal(409, 'ATTENDING_SUB_QUEST'), '행사 일정은 바꿀 수 없어요'],
    [refusal(404, 'SUB_QUEST_NOT_FOUND'), '이미 삭제된 일정이에요'],
    [refusal(403, 'NOT_QUEST_LEADER'), '파티장만 할 수 있어요'],
  ])('says why a cancel was refused, and fetches the Quest again: %j', async (reply, words) => {
    server.on(`DELETE ${STEPS}/${MEET?.id}`, reply);
    const user = await openRoom();
    const before = server.received(`GET /quests/${PICNIC.id}`).length;

    await user.press(screen.getAllByRole('button', { name: '일정 삭제' })[0]);
    await answer(user, '삭제');

    expect(toast()).toHaveTextContent(words);
    expect(server.received(`GET /quests/${PICNIC.id}`).length).toBeGreaterThan(before);
  });

  it('says that a Place is to be chosen again when the main server does not know it', async () => {
    server.on(`PUT ${STEPS}/${PICNIC_STEP?.id}`, refusal(404, 'PLACE_NOT_FOUND'));
    const user = await openRoom();

    await user.press(screen.getAllByRole('button', { name: '일정 수정' })[1]);
    await answer(user, '수정');

    expect(toast()).toHaveTextContent('장소를 다시 골라 주세요');
    expect(screen.getByLabelText('내용')).toBeVisible();
  });
});
