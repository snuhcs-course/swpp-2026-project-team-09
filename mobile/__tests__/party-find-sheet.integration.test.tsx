/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal, type Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, toast } from './support/room';
import { answerParty, CODING, invitationTo, JAZZ, openAt, requestFor, RUN } from './support/party';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// 찾기's 모집글 sheet, which a card opens over 찾기: its content, its buttons by role, joining through the join sheet
// and 관심 없음, which asks first (P06 ticket 12), against the fake main server.

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

type User = Awaited<ReturnType<typeof openAt>>;

function sheet(): ReturnType<typeof within> {
  return within(screen.getByLabelText('파티 모집글'));
}

// 찾기, with the card of `title` pressed.
async function openSheet(title: string): Promise<User> {
  const user = await openAt('/party');
  await user.press(screen.getByLabelText(title));
  return user;
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

describe('a press of a card', () => {
  it('slides the 모집글 up over 찾기, which stays', async () => {
    await openSheet(RUN.title);

    expect(shownAddress()).toBe('/party');
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
    expect(sheet().getByRole('header', { name: RUN.title })).toBeVisible();
  });

  it('shows the board and the fill, the title, the Leader, the time, the place, the members and 추천 이유', async () => {
    await openSheet(RUN.title);

    expect(sheet().getByText('취미 게시판')).toBeVisible();
    expect(sheet().getByText('3/8명')).toBeVisible();
    expect(sheet().getByText('최유나 · 모집자')).toBeVisible();
    expect(sheet().getByText('디자인학부 · 30분 전')).toBeVisible();
    expect(sheet().getByText('오늘 19:30')).toBeVisible();
    expect(sheet().getByText('버들골 (100동) 입구')).toBeVisible();
    expect(sheet().getByText('최유나 외 2명 · 친구 1명 포함')).toBeVisible();
    expect(sheet().getByText(RUN.description)).toBeVisible();
    expect(within(sheet().getByLabelText('추천 이유')).getByText('친구 최유나님이 모집했어요.')).toBeVisible();
  });

  it('shows the event of a 파티 for one, which takes no press', async () => {
    await openSheet(JAZZ.title);

    const event = sheet().getByTestId('event-line');
    expect(within(event).getByText('재즈 정기공연')).toBeVisible();
    expect(event).not.toHaveProp('accessibilityRole', 'button');
    expect(event).not.toHaveProp('onPress');
  });
});

describe('joining from the sheet', () => {
  it('closes the sheet, joins an Open Quest through the join sheet, and shows 내 파티', async () => {
    server.on(`POST /quests/${RUN.id}/join`, { status: 201, body: DINNER });
    const user = await openSheet(RUN.title);

    await user.press(sheet().getByRole('button', { name: '참여하기' }));
    expect(screen.queryByLabelText('파티 모집글')).toBeNull();
    expect(screen.getByText(`‘${RUN.title}’에 참여할까요?`)).toBeVisible();
    expect(screen.getByText('최유나 외 2명 · 친구 1명 포함 (3/8명)')).toBeVisible();
    await answer(user, '참여하기');

    expect(server.received(`POST /quests/${RUN.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent(`${RUN.title} 참여 완료`);
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
  });

  it('asks to join an Approval Quest', async () => {
    server.on('POST /quest-join-requests', { status: 201, body: { ...invitationTo(CODING, 'qr1') } });
    const user = await openSheet(CODING.title);

    await user.press(sheet().getByRole('button', { name: '참여 신청' }));
    await answer(user, '참여 신청');

    expect(server.received('POST /quest-join-requests')[0]?.body).toEqual({ questId: CODING.id });
    expect(toast()).toHaveTextContent('참여를 신청했어요보낸 신청 보기');
  });

  it.each([
    [refusal(409, 'QUEST_FULL'), '자리가 다 찼어요'],
    [refusal(409, 'QUEST_REMOVED_ASK'), '내보내진 파티라 파티장 승인이 필요해요'],
  ] as [Reply, string][])('says why joining was refused: %j', async (reply, words) => {
    server.on(`POST /quests/${RUN.id}/join`, reply);
    const user = await openSheet(RUN.title);

    await user.press(sheet().getByRole('button', { name: '참여하기' }));
    await answer(user, '참여하기');

    expect(toast()).toHaveTextContent(words);
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
  });
});

describe('a request that waits', () => {
  it('offers 신청 취소, which asks first, from the sheet', async () => {
    setAnswers({ requests: [requestFor(CODING)] });
    server.on('POST /quest-join-requests/qr1/withdraw', () => {
      setAnswers({ requests: [] });
      return { status: 204 };
    });
    const user = await openSheet(CODING.title);

    expect(sheet().getByText('참여 신청을 기다리는 중이에요')).toBeVisible();
    await user.press(sheet().getByRole('button', { name: '신청 취소' }));
    await pass(500);
    expect(screen.getByText(`‘${CODING.title}’ 참여 신청을 취소할까요?`)).toBeVisible();
    await answer(user, '신청 취소');

    expect(server.received('POST /quest-join-requests/qr1/withdraw')).toHaveLength(1);
    expect(toast()).toHaveTextContent('신청을 취소했어요');
  });
});

describe('관심 없음 on the sheet', () => {
  it('asks in a dialog, and 숨기기 hides the post and closes the sheet', async () => {
    const user = await openSheet(RUN.title);

    await user.press(sheet().getByRole('button', { name: '관심 없음' }));
    expect(screen.getByRole('header', { name: `‘${RUN.title}’를 숨길까요?` })).toBeVisible();
    expect(screen.getByText('숨긴 파티는 찾기에 다시 나오지 않아요. 한 번 숨기면 되돌릴 수 없어요.')).toBeVisible();
    await answer(user, '숨기기');

    expect(screen.queryByLabelText('파티 모집글')).toBeNull();
    expect(screen.queryByText(RUN.title)).toBeNull();
    expect(screen.getByText(CODING.title)).toBeVisible();
  });

  it('keeps the post and the sheet on 취소', async () => {
    const user = await openSheet(RUN.title);

    await user.press(sheet().getByRole('button', { name: '관심 없음' }));
    await answer(user, '취소');

    expect(screen.queryByRole('header', { name: `‘${RUN.title}’를 숨길까요?` })).toBeNull();
    expect(sheet().getByRole('header', { name: RUN.title })).toBeVisible();
    expect(screen.getByLabelText(RUN.title)).toBeVisible();
  });

  it('asks with 을 after a title that ends in a final consonant', async () => {
    setAnswers({ recruiting: [{ ...RUN, title: '버들골 저녁 러닝' }] });
    const user = await openSheet('버들골 저녁 러닝');

    await user.press(sheet().getByRole('button', { name: '관심 없음' }));

    expect(screen.getByRole('header', { name: '‘버들골 저녁 러닝’을 숨길까요?' })).toBeVisible();
  });
});
