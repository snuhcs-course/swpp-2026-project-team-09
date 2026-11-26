/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, toast } from './support/room';
import { answerParty, CODING, JAZZ, openAt, requestFor, RUN } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// 찾기 and 전체 파티 leave out a full recruiting Quest, and a 찾기 card whose request waits offers `신청 취소`, against
// the fake main server (P06-10).

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

// RUN with all eight places taken.
const FULL_RUN = { ...RUN, holderCount: 8 };

function card(title: string): ReturnType<typeof within> {
  return within(screen.getByLabelText(title));
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a full recruiting Quest', () => {
  it('is not among 찾기’s cards, and the others are', async () => {
    setAnswers({ recruiting: [FULL_RUN, CODING, JAZZ] });
    await openAt('/party');

    expect(await screen.findByText(CODING.title)).toBeVisible();
    expect(screen.getByText(JAZZ.title)).toBeVisible();
    expect(screen.queryByText(RUN.title)).toBeNull();
  });

  it('is not counted on the Boards card nor listed on its board', async () => {
    setAnswers({ recruiting: [FULL_RUN, CODING, JAZZ], quests: [] });
    const user = await openAt('/party');

    expect(
      await screen.findByRole('button', { name: '전체 게시판 · 식사 · 진로 · 취미 · 공연 모집글 2개 둘러보기' }),
    ).toBeVisible();
    await user.press(screen.getByRole('button', { name: '전체 게시판' }));
    expect(screen.getByRole('button', { name: '취미 게시판 · 모집글 0개' })).toBeVisible();
  });

  it('comes back once a place is free again', async () => {
    setAnswers({ recruiting: [{ ...RUN, holderCount: 7 }] });
    await openAt('/party');

    expect(card(RUN.title).getByText('7/8명')).toBeVisible();
    expect(card(RUN.title).getByRole('button', { name: '참여하기' })).toBeVisible();
  });
});

describe('a card whose request waits', () => {
  it('offers 신청 취소 in place of 참여 신청, and keeps 관심 없음', async () => {
    setAnswers({ requests: [requestFor(CODING)] });
    await openAt('/party');

    const coding = card(CODING.title);
    expect(coding.getByRole('button', { name: `${CODING.title} 신청 취소` })).toBeVisible();
    expect(coding.queryByRole('button', { name: '참여 신청' })).toBeNull();
    expect(coding.getByRole('button', { name: `${CODING.title} 관심 없음` })).toBeVisible();
  });

  it('asks before withdrawing, and shows 참여 신청 again once withdrawn', async () => {
    setAnswers({ requests: [requestFor(CODING)] });
    server.on('POST /quest-join-requests/qr1/withdraw', () => {
      setAnswers({ requests: [] });
      return { status: 204 };
    });
    const user = await openAt('/party');

    await user.press(card(CODING.title).getByRole('button', { name: `${CODING.title} 신청 취소` }));
    await pass(500);
    expect(screen.getByText(`‘${CODING.title}’ 참여 신청을 취소할까요?`)).toBeVisible();
    await answer(user, '취소');
    expect(server.received('POST /quest-join-requests/qr1/withdraw')).toHaveLength(0);

    await user.press(card(CODING.title).getByRole('button', { name: `${CODING.title} 신청 취소` }));
    await pass(500);
    await answer(user, '신청 취소');

    expect(server.received('POST /quest-join-requests/qr1/withdraw')).toHaveLength(1);
    expect(toast()).toHaveTextContent('신청을 취소했어요');
    expect(card(CODING.title).getByRole('button', { name: '참여 신청' })).toBeVisible();
  });

  it('leaves an Open Quest’s 참여하기 as it is', async () => {
    await openAt('/party');

    expect(card(RUN.title).getByRole('button', { name: '참여하기' })).toBeVisible();
    expect(card(RUN.title).queryByRole('button', { name: `${RUN.title} 신청 취소` })).toBeNull();
  });
});
