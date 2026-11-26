/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, HIS_PICNIC, toast, toastIcon } from './support/room';
import { answerParty, CODING, JAZZ, MY_HIKE, openAt, requestFor, RUN } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// 파티 모집글, the screen that a room, an invitation, the Assistant's cards and 행사 open, against the fake main server.
// It shows what 찾기's sheet shows (P06 ticket 12).

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

let server: FakeServer;
let setAnswers: ReturnType<typeof answerParty>;

// 김민준's Approval Quest on the hobby board, which the User holds, posted yesterday.
const HIS_HOLD = { ...HIS_PICNIC, joinPolicy: 'approval', createdAt: '2026-10-05T01:00:00.000Z' } as const;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server, { quests: [MY_HIKE, HIS_HOLD] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('파티 모집글', () => {
  it('shows the post with 참여하기 for an Open Quest', async () => {
    await openAt(`/post/${RUN.id}`);

    expect(screen.getByText('취미 게시판')).toBeVisible();
    expect(screen.getByText('3/8명')).toBeVisible();
    expect(screen.getByText('최유나 · 모집자')).toBeVisible();
    expect(screen.getByText('디자인학부 · 30분 전')).toBeVisible();
    expect(screen.getByRole('header', { name: RUN.title })).toBeVisible();
    expect(screen.getByText('최유나 외 2명 · 친구 1명 포함')).toBeVisible();
    expect(screen.getByRole('button', { name: '참여하기' })).toBeVisible();
  });

  it('shows the Leader’s Avatar once, without the members’ faces', async () => {
    await openAt(`/post/${RUN.id}`);

    expect(screen.getAllByRole('image', { name: /^[가-힣]{3}$/u })).toEqual([
      screen.getByRole('image', { name: '최유나' }),
    ]);
    expect(within(screen.getByLabelText('추천 이유')).getByText('친구 최유나님이 모집했어요.')).toBeVisible();
  });

  it('shows the Global Event’s post with its event line, which takes no press', async () => {
    await openAt(`/post/${JAZZ.id}`);

    expect(screen.getByText('시간 미정')).toBeVisible();
    expect(screen.getByText('장소 미정')).toBeVisible();
    expect(within(screen.getByTestId('event-line')).getByText('재즈 정기공연')).toBeVisible();
    expect(screen.getByTestId('event-line')).not.toHaveProp('onPress');
  });
});

describe('asking to join on 파티 모집글', () => {
  it('asks to join an Approval Quest, then waits with 신청 취소, which asks first as 찾기’s sheet does', async () => {
    server.on('POST /quest-join-requests', { status: 201, body: requestFor(CODING) });
    server.on('POST /quest-join-requests/qr1/withdraw', { status: 204 });
    const user = await openAt(`/post/${CODING.id}`);

    await user.press(screen.getByRole('button', { name: '참여 신청' }));
    setAnswers({ requests: [requestFor(CODING)] });
    await answer(user, '참여 신청');
    expect(screen.getByText('참여 신청을 기다리는 중이에요')).toBeVisible();

    await user.press(screen.getByRole('button', { name: '신청 취소' }));
    await pass(500);
    expect(screen.getByText(`‘${CODING.title}’ 참여 신청을 취소할까요?`)).toBeVisible();
    expect(screen.getByText('파티장에게 보낸 신청이 사라져요.')).toBeVisible();
    expect(server.received('POST /quest-join-requests/qr1/withdraw')).toHaveLength(0);

    setAnswers({ requests: [] });
    await answer(user, '신청 취소');
    expect(server.received('POST /quest-join-requests/qr1/withdraw')).toHaveLength(1);
    expect(toast()).toHaveTextContent('신청을 취소했어요');
    expect(screen.getByRole('button', { name: '참여 신청' })).toBeVisible();
  });

  it('says, as 보낸 신청 does, that the Leader declined when a withdrawal finds no request', async () => {
    setAnswers({ requests: [requestFor(CODING)] });
    server.on('POST /quest-join-requests/qr1/withdraw', refusal(404, 'QUEST_JOIN_REQUEST_NOT_FOUND'));
    const user = await openAt(`/post/${CODING.id}`);

    await user.press(screen.getByRole('button', { name: '신청 취소' }));
    await pass(500);
    await answer(user, '신청 취소');

    expect(toast()).toHaveTextContent('파티장이 신청을 받지 않았어요');
    expect(toastIcon()).toBe('alert');
  });
});

describe('관심 없음 on 파티 모집글', () => {
  it('asks in a dialog, and 숨기기 hides the post and goes back to 찾기', async () => {
    const user = await openAt('/party');
    await act(() => {
      router.push(`/post/${RUN.id}`);
    });
    await pass(500);

    await user.press(screen.getByRole('button', { name: '관심 없음' }));
    expect(screen.getByRole('header', { name: `‘${RUN.title}’를 숨길까요?` })).toBeVisible();
    await answer(user, '숨기기');

    expect(shownAddress()).toBe('/party');
    expect(screen.queryByText(RUN.title)).toBeNull();
  });

  it('stays on 취소', async () => {
    const user = await openAt(`/post/${RUN.id}`);

    await user.press(screen.getByRole('button', { name: '관심 없음' }));
    await answer(user, '취소');

    expect(shownAddress()).toBe(`/post/${RUN.id}`);
    expect(screen.getByRole('header', { name: RUN.title })).toBeVisible();
  });
});

describe('파티 모집글 of a Quest the User holds', () => {
  it('notes that another Holder already holds it', async () => {
    await openAt(`/post/${HIS_HOLD.id}`);

    expect(screen.getByText('이미 참여 중인 파티예요')).toBeVisible();
    expect(screen.queryByRole('button', { name: '참여하기' })).toBeNull();
  });

  it('lets the Leader end it with 없애기, for every Holder', async () => {
    server.on(`POST /quests/${MY_HIKE.id}/end`, { status: 204 });
    const user = await openAt(`/post/${MY_HIKE.id}`);

    await user.press(screen.getByRole('button', { name: '없애기' }));
    expect(screen.getByText('모집글과 파티가 함께 사라져요.')).toBeVisible();
    await answer(user, '없애기');

    expect(server.received(`POST /quests/${MY_HIKE.id}/end`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('파티를 없앴어요');
  });

  it('opens the form in its edit mode with 수정하기', async () => {
    server.on(`GET /quests/${MY_HIKE.id}`, { status: 200, body: MY_HIKE });
    const user = await openAt(`/post/${MY_HIKE.id}`);

    await user.press(screen.getByRole('button', { name: '수정하기' }));
    await pass(500);

    expect(screen.getByRole('header', { name: '모집글 수정' })).toBeVisible();
    expect(screen.getByDisplayValue(MY_HIKE.title)).toBeVisible();
  });
});
