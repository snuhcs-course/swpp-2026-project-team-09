/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { KeptNotification } from '@/api/waiting-types';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, DINNER, JOIN_REQUESTS, PHONE_NOW, STUDY } from './support/server';

// The Notifications of a request to join in 알림: the Leader's answer, told to the one who asked, and the requests
// waiting, told to the Leader, whose row 알림 already composes from the requests.

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

const ACCEPTED: KeptNotification = {
  id: `join-accepted:party:${DINNER.id}`,
  kind: 'join-accepted',
  title: '참여 신청이 수락됐어요',
  ahead: null,
  line: '저녁 약속 · 김민준님의 파티',
  at: '2026-10-06T12:58:00+09:00',
  url: `/main?card=party:${DINNER.id}`,
};

const DECLINED: KeptNotification = {
  id: 'join-declined:find-parties:q-coding',
  kind: 'join-declined',
  title: '참여 신청이 거절됐어요',
  ahead: null,
  line: '코딩 테스트 스터디 · 김민준님의 파티',
  at: '2026-10-06T12:50:00+09:00',
  url: '/main?card=find-parties:q-coding',
};

const ASKED: KeptNotification = {
  id: `join-asked:party:${STUDY.id}`,
  kind: 'join-asked',
  title: '새 참여 신청 2명',
  ahead: null,
  line: '알고리즘 스터디 · 윤태오님 외 1명',
  at: '2026-10-06T12:40:00+09:00',
  url: `/main?card=party:${STUDY.id}`,
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /notifications', { status: 200, body: [ACCEPTED, DECLINED, ASKED] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openNotifications(bell: string): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
  await user.press(screen.getByRole('button', { name: bell }));
  await pass(500);
  return user;
}

describe('a request to join accepted, in 알림', () => {
  it("is a row with its words, which opens the party's card", async () => {
    const user = await openNotifications('알림');

    const row = screen.getByRole('button', { name: '참여 신청이 수락됐어요 · 저녁 약속 · 김민준님의 파티 · 12:58' });
    await user.press(row);
    await pass(500);

    expect(screen.queryByRole('header', { name: /^알림/u })).toBeNull();
    expect(screen.getByRole('header', { name: '저녁 약속' })).toBeVisible();
  });
});

describe('a request to join declined, in 알림', () => {
  it('is a row with its words, which opens 찾기 for another 파티', async () => {
    const user = await openNotifications('알림');

    const row = screen.getByRole('button', {
      name: '참여 신청이 거절됐어요 · 코딩 테스트 스터디 · 김민준님의 파티 · 12:50',
    });
    await user.press(row);
    await pass(500);

    expect(shownAddress()).toBe('/party?tab=find');
  });
});

describe('an answer to a request to join a 파티 with a long title, in 알림', () => {
  it('leads with the answer, so that the title of the 파티 is what is cut', async () => {
    const long = '이번 주 금요일 저녁 샤로수길 맛집 탐방하고 2차로 노래방까지 가실 분들 모여요';
    server.on('GET /notifications', {
      status: 200,
      body: [{ ...DECLINED, line: `${long} · 김민준님의 파티` }],
    });

    await openNotifications('알림');

    expect(screen.getByText('참여 신청이 거절됐어요')).toBeVisible();
    expect(screen.getByText(`${long} · 김민준님의 파티`)).toBeVisible();
  });
});

describe('the requests waiting for the Leader, in 알림', () => {
  it('are one row, composed from the requests, and not the kept one again', async () => {
    server.on('GET /quests', { status: 200, body: [DINNER, STUDY] });
    server.on(`GET /quests/${STUDY.id}/join-requests`, { status: 200, body: JOIN_REQUESTS });

    await openNotifications('알림 1개');

    expect(screen.getByRole('button', { name: '참여 신청 2명 · 알고리즘 스터디' })).toBeVisible();
    expect(screen.queryByText(ASKED.title)).toBeNull();
  });

  it('leave the kept one out even when no request is listed', async () => {
    await openNotifications('알림');

    expect(screen.queryByText(ASKED.title)).toBeNull();
  });
});
