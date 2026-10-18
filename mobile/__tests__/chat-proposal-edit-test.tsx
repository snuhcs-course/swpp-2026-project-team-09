/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { QuestProposal } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { PLACES } from './support/dining';
import { CAREER, MY_CAREER } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerParty, MY_HIKE, YU_NA } from './support/party';
import { MIN_JUN_HOLDER, SEO_YEON_HOLDER, toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// 수정 on the chat's Proposal card: the party form filled with the Proposal, and making the Quest from it, against the
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

const ASKED = '내일 점심 학생회관에서 학식 모집해줘';
const REPLY = '이렇게 만들까요? 만들기를 누르기 전에는 아무것도 만들지 않아요.';

// Tomorrow's lunch at 학생회관 on the meal Board, by approval, inviting 김민준, the phone's clock standing on
// 2026-10-06 at 13:00 in Korea.
const LUNCH: QuestProposal = {
  title: '학식 같이 먹어요',
  description: '내일 점심 학식 같이 먹을 사람 모집해요',
  joinPolicy: 'approval',
  board: 'meal',
  capacity: 5,
  startsAt: '2026-10-07T12:00:00+09:00',
  place: { id: 'p63', name: '학생회관' },
  globalEvent: null,
  invitees: [{ id: MIN_JUN_HOLDER.id, name: MIN_JUN_HOLDER.name }],
};

// A 비공개 파티 for AI 커리어 설명회 (today 18:00), meeting at 17:00 at its place, inviting 이서연, 최유나 and a
// Friend the User is no longer Friends with.
const CLOSED: QuestProposal = {
  title: '설명회 같이 가요',
  description: '',
  joinPolicy: 'closed',
  board: null,
  capacity: 4,
  startsAt: '2026-10-06T17:00:00+09:00',
  place: null,
  globalEvent: CAREER,
  invitees: [
    { id: SEO_YEON_HOLDER.id, name: SEO_YEON_HOLDER.name },
    { id: YU_NA.id, name: YU_NA.name },
    { id: '6d1c3f5e-5555-4a5b-8c9d-0000000000ff', name: '한가람' },
  ],
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('GET /places', { status: 200, body: PLACES });
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 204 });
  server.on('POST /quests', { status: 201, body: MY_CAREER });
  server.on(`PATCH /quests/${MY_CAREER.id}`, { status: 200, body: MY_CAREER });
  server.on(`POST /quests/${MY_CAREER.id}/sub-quests`, { status: 201, body: MY_CAREER.subQuests[0] });
  server.on(`POST /quests/${MY_CAREER.id}/invitations`, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Opens the chat, asks for a 파티, lets the Assistant answer with this Proposal and presses 수정 on its card.
async function edited(proposal: QuestProposal): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: { text: REPLY, mapButtons: [], cards: [], proposal } });
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await user.type(screen.getByLabelText(AI_INPUT), ASKED);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  await user.press(card().getByRole('button', { name: '수정' }));
  await pass(500);
  return user;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('proposal-card'));
}

function bodies(route: string): unknown[] {
  return server.received(route).map(({ body }) => body);
}

// No photo and no tag chosen, as in a new 파티.
function expectNoPhotoOrTags(): void {
  expect(screen.queryByTestId('photo-preview')).toBeNull();
  expect(screen.queryAllByRole('button', { name: /^#/u, selected: true })).toEqual([]);
}

describe('수정 on a Proposal of a 공개 파티', () => {
  it('closes the chat and opens the party form with every field filled in', async () => {
    await edited(LUNCH);

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(shownAddress()).toBe('/party-form?fromProposal=1');
    expect(screen.getByLabelText('제목')).toHaveDisplayValue(LUNCH.title);
    expect(screen.getByLabelText('본문')).toHaveDisplayValue(LUNCH.description);
    expect(screen.getByRole('button', { name: '언제 내일 12:00' })).toBeVisible();
    expect(screen.getByText('5명')).toBeVisible();
    expect(screen.getByLabelText('어디서')).toHaveDisplayValue('학생회관');
    expect(screen.getByRole('radio', { name: '공개' })).toBeChecked();
    expect(screen.getByRole('button', { name: '승인 후 참여' })).toBeSelected();
    expect(screen.getByRole('button', { name: '게시판 식사 게시판' })).toBeVisible();
    expect(screen.getByRole('button', { name: '관련 행사 선택' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: MIN_JUN_HOLDER.name })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: SEO_YEON_HOLDER.name })).not.toBeChecked();
    expectNoPhotoOrTags();
  });

  it('makes the Quest at the Place and invites the Friend, as the form filled by hand does', async () => {
    const user = await edited(LUNCH);

    await user.press(screen.getByRole('button', { name: '파티 올리기' }));
    await pass(500);

    expect(bodies('POST /quests/own')).toEqual([
      {
        title: LUNCH.title,
        description: LUNCH.description,
        capacity: 5,
        joinPolicy: 'approval',
        board: 'meal',
        subQuest: { title: LUNCH.title, startsAt: LUNCH.startsAt, place: { placeId: 'p63' } },
      },
    ]);
    expect(bodies(`POST /quests/${MY_HIKE.id}/invitations`)).toEqual([{ userId: MIN_JUN_HOLDER.id }]);
    expect(toast()).toHaveTextContent('파티를 올렸어요 · 1명에게 초대 요청');
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
  });
});

describe('수정 on a Proposal of a 비공개 파티 for an event', () => {
  it('opens the form with the event chosen, its title and meeting time kept, and the Friends still Friends chosen', async () => {
    await edited(CLOSED);

    expect(screen.getByRole('radio', { name: '비공개' })).toBeChecked();
    expect(screen.queryByRole('button', { name: /^게시판/u })).toBeNull();
    expect(screen.getByTestId('chosen-event')).toHaveTextContent(CAREER.title, { exact: false });
    expect(screen.getByLabelText('제목')).toHaveDisplayValue(CLOSED.title);
    expect(screen.getByRole('button', { name: '언제 오늘 17:00' })).toBeVisible();
    expect(screen.getByLabelText('어디서')).toHaveDisplayValue('301동 대강당');
    expect(screen.getByText('4명')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: SEO_YEON_HOLDER.name })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: YU_NA.name })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: MIN_JUN_HOLDER.name })).not.toBeChecked();
    expect(screen.queryByRole('checkbox', { name: '한가람' })).toBeNull();
    expectNoPhotoOrTags();
  });

  it('attends the event, sets the Quest, meets before it and invites the Friends still Friends', async () => {
    const user = await edited(CLOSED);

    await user.press(screen.getByRole('button', { name: '파티 만들기' }));
    await pass(500);

    expect(bodies('POST /quests')).toEqual([{ globalEventId: CAREER.id, title: CLOSED.title }]);
    expect(bodies(`PATCH /quests/${MY_CAREER.id}`)).toEqual([
      { title: CLOSED.title, description: '', capacity: 4, joinPolicy: 'closed' },
    ]);
    expect(bodies(`POST /quests/${MY_CAREER.id}/sub-quests`)).toEqual([
      {
        title: '모이기',
        startsAt: CLOSED.startsAt,
        place: { latitude: CAREER.latitude, longitude: CAREER.longitude, label: '301동 대강당' },
      },
    ]);
    expect(bodies(`POST /quests/${MY_CAREER.id}/invitations`)).toEqual([
      { userId: SEO_YEON_HOLDER.id },
      { userId: YU_NA.id },
    ]);
    expect(toast()).toHaveTextContent('비공개 파티를 만들었어요 · 2명에게 초대 요청');
  });
});

describe('the chat after 수정', () => {
  it('keeps the conversation and the card as they were when the User comes back without making', async () => {
    const user = await edited(LUNCH);

    await user.press(screen.getByRole('button', { name: '뒤로' }));
    await pass(500);
    await user.press(screen.getByLabelText(AI_INPUT));

    expect(screen.getByTestId('user-bubble')).toHaveTextContent(ASKED);
    expect(screen.getByTestId('assistant-bubble')).toHaveTextContent(REPLY, { exact: false });
    expect(card().getByRole('button', { name: '만들기' })).toBeEnabled();
    expect(card().getByRole('button', { name: '수정' })).toBeEnabled();
    expect(server.received('POST /quests/own')).toEqual([]);
  });

  it('shows the Proposal as made once the form made it, so that it is not made again', async () => {
    const user = await edited(LUNCH);
    await user.press(screen.getByRole('button', { name: '파티 올리기' }));
    await pass(500);

    await user.press(screen.getByRole('tab', { name: '지도' }));
    await user.press(screen.getByLabelText(AI_INPUT));

    expect(card().getByRole('button', { name: '만들었어요' })).toBeDisabled();
    expect(card().getByRole('button', { name: '수정' })).toBeDisabled();
    expect(server.received('POST /quests/own')).toHaveLength(1);
  });
});
