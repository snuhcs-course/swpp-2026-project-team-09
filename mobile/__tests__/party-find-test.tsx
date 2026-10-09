/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal, type Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { socketServer, theSocket } from './support/live';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, toast } from './support/room';
import { answerParty, CODING, invitationTo, JAZZ, openAt, RUN } from './support/party';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// 찾기: the recruiting Quests, the search and joining through the confirm sheet, against the fake main server.

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

describe('모집 중인 파티', () => {
  it('shows each recruiting Quest as a card, the newest first', async () => {
    await openAt('/party');

    const run = card(RUN.title);
    expect(run.getByText('파티')).toBeVisible();
    expect(run.getByText('3/8명')).toBeVisible();
    expect(run.getByText(RUN.description)).toBeVisible();
    expect(run.getByText('오늘 19:30')).toBeVisible();
    expect(run.getByText('버들골 (100동) 입구')).toBeVisible();
    expect(run.getByText('최유나 외 2명')).toBeVisible();
    expect(run.getByRole('button', { name: '참여하기' })).toBeVisible();
    expect(card(CODING.title).getByRole('button', { name: '참여 신청' })).toBeVisible();
    expect(card(CODING.title).getByText('장소 미정')).toBeVisible();
    expect(card(JAZZ.title).getByText('재즈 정기공연')).toBeVisible();
    expect(card(JAZZ.title).getByText('시간 미정')).toBeVisible();
    const titles = screen
      .getAllByText(/^(버들골 저녁|알고리즘|재즈 동아리)/u)
      .map(({ props }) => String(props.children));
    expect(titles).toEqual([RUN.title, CODING.title, JAZZ.title]);
  });

  it('filters the cards by title and description, and says when none is left', async () => {
    const user = await openAt('/party');

    await user.type(screen.getByLabelText('파티 검색'), '코드 리뷰');
    expect(screen.getByText(CODING.title)).toBeVisible();
    expect(screen.queryByText(RUN.title)).toBeNull();

    await user.clear(screen.getByLabelText('파티 검색'));
    await user.type(screen.getByLabelText('파티 검색'), '없는 파티');
    expect(screen.getByText('결과 없음')).toBeVisible();
  });

  it('opens the post with 자세히', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByRole('button', { name: `${RUN.title} 모집글 자세히 보기` }));

    expect(shownAddress()).toBe(`/post/${RUN.id}`);
  });
});

describe('joining through the confirm sheet', () => {
  it('joins an Open Quest at once and shows 내 파티', async () => {
    server.on(`POST /quests/${RUN.id}/join`, { status: 201, body: DINNER });
    const user = await openAt('/party');

    await user.press(card(RUN.title).getByRole('button', { name: '참여하기' }));
    expect(screen.getByText(`‘${RUN.title}’에 참여할까요?`)).toBeVisible();
    expect(screen.getByText('최유나 외 2명 (3/8명)')).toBeVisible();
    expect(screen.getByText('멤버가 파티를 활성화하면, 수락한 멤버끼리 위치를 공유해요.')).toBeVisible();
    await answer(user, '참여하기');

    expect(server.received(`POST /quests/${RUN.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent(`${RUN.title} 참여 완료`);
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
  });

  it('asks to join an Approval Quest', async () => {
    server.on('POST /quest-join-requests', { status: 201, body: { ...invitationTo(CODING, 'qr1') } });
    const user = await openAt('/party');

    await user.press(card(CODING.title).getByRole('button', { name: '참여 신청' }));
    await answer(user, '참여 신청');

    expect(server.received('POST /quest-join-requests')[0]?.body).toEqual({ questId: CODING.id });
    expect(toast()).toHaveTextContent('참여를 신청했어요');
  });
});

describe('a refused joining', () => {
  it.each([
    [refusal(409, 'QUEST_FULL'), '자리가 다 찼어요'],
    [refusal(409, 'QUEST_ENDED'), '이미 끝난 파티예요'],
    [refusal(409, 'SHARED_QUEST_HELD'), '이 행사에 함께 가는 파티가 이미 있어요'],
    [refusal(409, 'ALREADY_HOLDER'), '이미 참여 중인 파티예요'],
    [refusal(404, 'QUEST_NOT_FOUND'), '파티를 찾을 수 없어요'],
    [refusal(409, 'QUEST_NOT_OPEN'), '참여 방식이 바뀌었어요. 다시 확인해 주세요'],
  ] as [Reply, string][])('says why joining was refused: %j', async (reply, words) => {
    server.on(`POST /quests/${RUN.id}/join`, reply);
    const user = await openAt('/party');
    const asked = server.received('GET /quests/recruiting').length;

    await user.press(card(RUN.title).getByRole('button', { name: '참여하기' }));
    await answer(user, '참여하기');

    expect(toast()).toHaveTextContent(words);
    expect(server.received('GET /quests/recruiting').length).toBeGreaterThan(asked);
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
  });

  it.each([
    [refusal(409, 'QUEST_NOT_APPROVAL'), '참여 방식이 바뀌었어요. 다시 확인해 주세요'],
    [refusal(409, 'QUEST_JOIN_REQUEST_ALREADY_SENT'), '이미 참여를 신청했어요'],
  ] as [Reply, string][])('says why asking was refused: %j', async (reply, words) => {
    server.on('POST /quest-join-requests', reply);
    const user = await openAt('/party');

    await user.press(card(CODING.title).getByRole('button', { name: '참여 신청' }));
    await answer(user, '참여 신청');

    expect(toast()).toHaveTextContent(words);
  });
});

describe('quests-changed', () => {
  it('fetches 찾기, 내 파티 and 초대 again', async () => {
    await openAt('/party');
    await socketServer((socket) => {
      socket.accept();
    });

    setAnswers({ recruiting: [CODING], quests: [], invitations: [invitationTo(RUN, 'qi9')] });
    await act(() => {
      theSocket().send('quests-changed');
    });
    await pass(500);

    expect(screen.queryByText(RUN.title)).toBeNull();
    expect(screen.getByText(CODING.title)).toBeVisible();
    expect(screen.getByRole('tab', { name: /^초대/u })).toHaveTextContent('초대1');
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toHaveTextContent('내 파티');
    expect(screen.getByRole('tab', { name: /^내 파티/u })).not.toHaveTextContent('1');
  });
});
