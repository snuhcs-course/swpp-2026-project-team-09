/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act, type userEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { QuestProposal } from '@/api/assistant-types';
import { GROUP_ROOM, libraryCard, ROOM_NOTES } from '@/api/mock/data/library';
import { pass, screen } from './app';
import type { FakeServer } from './fake-server';
import { sockets } from './fake-socket';
import { card } from './library-chat';
import { AI_INPUT } from './lists';
import { givePhone, ON_CAMPUS, openMain } from './main';
import { startFresh } from './mocks';
import { answerParty, MY_HIKE } from './party';
import { fillPublic } from './party-form';
import { MIN_JUN_HOLDER } from './room';
import { askMainServer, PHONE_NOW } from './server';

// The design's moments after which the app asks about push: a Party sent with a Friend, from the Party form or from
// the Proposal card, and a library booking. A test file that uses it mocks what `server.ts` and `live.ts` say, and
// `expo-image-picker`.

type User = ReturnType<typeof userEvent.setup>;

export const REGISTER = 'PUT /users/me/push-token';

// The fake main server answering the 파티 tab, making MY_HIKE, its invitations and the token's registration.
export async function startServerBuild(): Promise<FakeServer> {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  const server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 204 });
  server.on(REGISTER, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  return server;
}

// 파티 만들기 opened from the 파티 tab, filled in and sent, inviting these Friends.
export async function sendParty(user: User, friends: readonly string[]): Promise<void> {
  await act(() => {
    router.navigate('/party');
  });
  await pass(500);
  await user.press(screen.getByRole('button', { name: '만들기' }));
  await pass(500);
  await fillPublic(user);
  for (const friend of friends) {
    // oxlint-disable-next-line no-await-in-loop -- each press after the one before
    await user.press(screen.getByRole('checkbox', { name: friend }));
  }
  await user.press(screen.getByRole('button', { name: '파티 올리기' }));
  await pass(500);
}

// A 공개 파티 on the meal Board tomorrow at noon, inviting 김민준.
export const LUNCH: QuestProposal = {
  title: '학식 같이 먹어요',
  description: '내일 점심 학식 같이 먹을 사람 모집해요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2026-10-07T12:00:00+09:00',
  place: null,
  globalEvent: null,
  invitees: [{ id: MIN_JUN_HOLDER.id, name: MIN_JUN_HOLDER.name }],
};

// Opens the chat, lets the Assistant answer with the Proposal and presses 만들기 on its card.
export async function makeProposal(server: FakeServer, proposal: QuestProposal): Promise<User> {
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: '이렇게 만들까요?', mapButtons: [], cards: [], proposal },
  });
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await user.type(screen.getByLabelText(AI_INPUT), '내일 점심 학식 같이 먹을 사람 모집해줘');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  await user.press(within(screen.getByTestId('proposal-card')).getByRole('button', { name: '만들기' }));
  await pass(500);
  return user;
}

// A 6인실 of 그룹스터디룸 today at 17:00 for an hour.
export const ROOM_CARD = card(
  libraryCard('book:4F-group-6:2026-11-02:1700:60', 'book', {
    space: GROUP_ROOM,
    date: '2026-11-02',
    start: '17:00',
    minutes: 60,
    useDescOptions: ['강의', '과제', '동아리활동', '연구', '취업', '기타'],
    notes: ROOM_NOTES,
  }),
);
