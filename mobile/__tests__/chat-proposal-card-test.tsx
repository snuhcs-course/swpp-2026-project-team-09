/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { QuestProposal } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerParty, MY_HIKE } from './support/party';
import { toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// The Proposal card of the Assistant's answers and its 만들기, against the fake main server.

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

const ASKED = '내일 점심에 학식 같이 먹을 사람 4명 모집해줘, 식사 게시판에';
const REPLY = '이렇게 만들까요? 만들기를 누르기 전에는 아무것도 만들지 않아요.';

// Tomorrow's lunch on the meal Board, the phone's clock standing on 2026-10-06 at 13:00 in Korea.
const LUNCH: QuestProposal = {
  title: '학식 같이 먹어요',
  description: '내일 점심 학식 같이 먹을 사람 모집해요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2026-10-07T12:00:00+09:00',
  place: null,
  globalEvent: null,
  invitees: [],
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

function answerWith(proposal: QuestProposal | null): void {
  server.on('POST /assistant/messages', { status: 200, body: { text: REPLY, mapButtons: [], cards: [], proposal } });
}

async function say(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

// Opens the chat, asks for a 파티 and lets the Assistant answer with this Proposal.
async function proposed(proposal: QuestProposal = LUNCH): Promise<User> {
  answerWith(proposal);
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await say(user, ASKED);
  return user;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('proposal-card'));
}

function make(): ReturnType<typeof screen.getByRole> {
  return card().getByRole('button', { name: '만들기' });
}

describe('the Proposal card of an answer', () => {
  it("lists the Proposal's fields as rows, the ones it does not fill as empty", async () => {
    await proposed();

    expect(within(screen.getByTestId('assistant-bubble')).getByTestId('proposal-card')).toBeVisible();
    for (const row of [
      '제목 학식 같이 먹어요',
      '공개 범위 공개 · 바로 참여',
      '게시판 식사 게시판',
      '언제 내일 12:00',
      '어디서 없음',
      '관련 행사 없음',
      '친구 초대 없음',
      '인원 4명',
    ]) {
      expect(card().getByLabelText(row)).toBeVisible();
    }
    expect(card().getByText(LUNCH.description)).toBeVisible();
    expect(card().queryByText(/사진|태그/u)).toBeNull();
    expect(make()).toBeEnabled();
    expect(card().getByRole('button', { name: '수정' })).toBeDisabled();
  });

  it('shows an Approval Quest as 공개 with 승인 후 참여', async () => {
    await proposed({ ...LUNCH, joinPolicy: 'approval' });

    expect(card().getByLabelText('공개 범위 공개 · 승인 후 참여')).toBeVisible();
  });

  it('is not drawn under an answer without one', async () => {
    const user = await proposed();
    answerWith(null);

    await say(user, '고마워');

    expect(screen.getAllByTestId('proposal-card')).toHaveLength(1);
  });
});

describe('the Proposal sent back', () => {
  it('goes with its message by its values, the last Proposal only', async () => {
    const user = await proposed();
    answerWith({ ...LUNCH, capacity: 3 });
    await say(user, '3명으로 해줘');
    answerWith(null);

    await say(user, '시간만 1시로');

    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual({
      messages: [
        { role: 'user', text: ASKED },
        { role: 'assistant', text: REPLY, cards: [] },
        { role: 'user', text: '3명으로 해줘' },
        { role: 'assistant', text: REPLY, cards: [], proposal: { ...LUNCH, capacity: 3 } },
        { role: 'user', text: '시간만 1시로' },
      ],
    });
  });
});

describe('만들기', () => {
  it('makes the Quest as the party form does, then shows the toast and 내 파티', async () => {
    const user = await proposed();

    await user.press(make());
    await pass(500);

    expect(server.received('POST /quests/own')).toHaveLength(1);
    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({
      title: LUNCH.title,
      description: LUNCH.description,
      capacity: 4,
      joinPolicy: 'open',
      board: 'meal',
      subQuest: { title: LUNCH.title, startsAt: LUNCH.startsAt },
    });
    expect(toast()).toHaveTextContent('파티를 올렸어요');
    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
  });

  it('shows a refusal as the form does, and keeps the chat open to try again', async () => {
    server.on('POST /quests/own', refusal(409, 'BOARD_REQUIRED'));
    const user = await proposed();

    await user.press(make());
    await pass(500);

    expect(toast()).toHaveTextContent('게시판을 골라 주세요');
    expect(screen.getByTestId('chat-sheet')).toBeVisible();
    expect(make()).toBeEnabled();
  });
});
