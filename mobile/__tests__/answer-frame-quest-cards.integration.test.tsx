/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { RecruitingQuest } from '@/api/party-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerEvents, MAJOR, SEO_YEON_GOING, TAE_O_GOING } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { invitationTo } from './support/party';
import { answer, toast } from './support/room';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// The recruiting Quests of the Assistant's answers, drawn in the answer frame's card as 찾기's post cards, against the
// fake main server.

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

const REPLY = '곧 모이는 파티예요. 운동, 식사처럼 원하는 걸 말해 주시면 좁혀 드릴게요.';

// An Open Quest and an Approval one, with titles of their own.
const FUTSAL: RecruitingQuest = { ...SEO_YEON_GOING, title: '풋살 한 판', description: '실력 무관!' };
const BADMINTON: RecruitingQuest = { ...TAE_O_GOING, title: '배드민턴 복식' };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerEvents(server);
  server.on('GET /quest-join-requests', { status: 200, body: [] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Sends 파티 찾기 from the map's bar and lets the Assistant answer with these cards.
async function answered(cards: object[]): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: { text: REPLY, mapButtons: [], cards, proposal: null } });
  const user = await openMain();
  await user.type(screen.getByLabelText(AI_INPUT), '파티 찾기');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

const questCards = [FUTSAL, BADMINTON].map((quest) => ({ kind: 'quest', quest }));

function frame(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function cardInFrame(title: string): ReturnType<typeof within> {
  return within(frame().getByLabelText(title));
}

describe('the Quest cards of an answer', () => {
  it("shows them in the frame's card as 찾기's post cards, with no 관심 없음", async () => {
    await answered(questCards);

    expect(frame().getByText(REPLY)).toBeVisible();
    expect(cardInFrame(FUTSAL.title).queryByText('실력 무관!')).toBeNull();
    expect(cardInFrame(FUTSAL.title).getByText('301동 앞')).toBeVisible();
    expect(cardInFrame(FUTSAL.title).getByText('2/4명')).toBeVisible();
    expect(cardInFrame(FUTSAL.title).getByRole('button', { name: '참여하기' })).toBeVisible();
    expect(cardInFrame(BADMINTON.title).getByRole('button', { name: '참여 신청' })).toBeVisible();
    expect(frame().queryByRole('button', { name: /관심 없음/u })).toBeNull();
  });

  it('keeps the order the Assistant showed them in, among event cards, and sends them back as references', async () => {
    const user = await answered([questCards[0], { kind: 'globalEvent', globalEvent: MAJOR }, questCards[1]]);

    expect(frame().getAllByTestId(/^(?:post|event)-/u)).toEqual([
      frame().getByTestId(`post-${FUTSAL.id}`),
      frame().getByTestId(`event-${MAJOR.id}`),
      frame().getByTestId(`post-${BADMINTON.id}`),
    ]);

    await user.type(screen.getByLabelText(AI_INPUT), '고마워');
    await user.press(screen.getByRole('button', { name: '보내기' }));

    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(
      expect.objectContaining({
        messages: [
          { role: 'user', text: '파티 찾기' },
          {
            role: 'assistant',
            text: REPLY,
            cards: [
              { kind: 'quest', id: FUTSAL.id },
              { kind: 'globalEvent', id: MAJOR.id },
              { kind: 'quest', id: BADMINTON.id },
            ],
          },
          { role: 'user', text: '고마워' },
        ],
      }),
    );
  });
});

describe('a Quest card pressed', () => {
  it('opens the post', async () => {
    const user = await answered(questCards);

    await user.press(frame().getByTestId(`post-${FUTSAL.id}`));
    await pass(500);

    expect(shownAddress()).toBe(`/post/${FUTSAL.id}`);
  });

  it('opens the post from its title as well, the button a screen reader finds', async () => {
    const user = await answered(questCards);

    await user.press(frame().getByRole('button', { name: `${BADMINTON.title} 모집글 자세히 보기` }));
    await pass(500);

    expect(shownAddress()).toBe(`/post/${BADMINTON.id}`);
  });
});

describe("a Quest card's join button", () => {
  it("opens 찾기's join confirmation over the frame, which joins an Open Quest", async () => {
    server.on(`POST /quests/${FUTSAL.id}/join`, { status: 201, body: DINNER });
    const user = await answered(questCards);

    await user.press(cardInFrame(FUTSAL.title).getByRole('button', { name: '참여하기' }));
    await pass(500);

    expect(screen.getByText(`‘${FUTSAL.title}’에 참여할까요?`)).toBeVisible();
    expect(screen.getByTestId('answer-card')).toBeVisible();

    await answer(user, '참여하기');

    expect(server.received(`POST /quests/${FUTSAL.id}/join`)).toHaveLength(1);
    expect(toast()).toHaveTextContent(`${FUTSAL.title} 참여 완료`);
  });

  it('asks to join an Approval Quest through the same confirmation', async () => {
    server.on('POST /quest-join-requests', { status: 201, body: invitationTo(BADMINTON, 'qr1') });
    const user = await answered(questCards);

    await user.press(cardInFrame(BADMINTON.title).getByRole('button', { name: '참여 신청' }));
    await pass(500);
    expect(screen.getByText(`‘${BADMINTON.title}’에 참여할까요?`)).toBeVisible();
    await answer(user, '참여 신청');

    expect(server.received('POST /quest-join-requests')[0]?.body).toEqual({ questId: BADMINTON.id });
    expect(toast()).toHaveTextContent('참여를 신청했어요보낸 신청 보기');
  });

  it('asks to join an Open Quest the Leader removed the User from', async () => {
    server.on('GET /quest-removals', {
      status: 200,
      body: [{ questId: FUTSAL.id, removedAt: '2026-10-06T03:00:00.000Z' }],
    });
    await answered(questCards);

    expect(cardInFrame(FUTSAL.title).getByRole('button', { name: '참여 신청' })).toBeVisible();
    expect(cardInFrame(FUTSAL.title).queryByRole('button', { name: '참여하기' })).toBeNull();
  });
});
