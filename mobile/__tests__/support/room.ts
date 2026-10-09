/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act, type userEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { MyParty, Party, Person, Quest } from '@/api/types';
import type { FakeServer, Reply } from './fake-server';
import { pass, screen } from './app';
import { openMain } from './main';
import { answerMainScreen, DINNER, ME_ID, MIN_JUN } from './server';

// A Quest's room against the fake main server. A test file that uses it mocks what `server.ts` and `live.ts` say.

export const ME_HOLDER: Person = { id: ME_ID, name: '홍길동', department: '컴퓨터공학부' };
export const MIN_JUN_HOLDER: Person = { id: MIN_JUN.id, name: MIN_JUN.name, department: MIN_JUN.department };
export const SEO_YEON_HOLDER: Person = {
  id: '6d1c3f5e-3333-4a5b-8c9d-000000000003',
  name: '이서연',
  department: '경영학과',
};

// The User's Open Quest with 김민준 and 이서연, today at 17:40 at 301동 and 18:00 to 20:00 at 자하연.
export const PICNIC: Quest = {
  id: '9a7e0c1d-0000-4f00-8000-0000000a0001',
  title: '자하연 피크닉',
  globalEvent: null,
  leader: ME_HOLDER,
  capacity: 4,
  joinPolicy: 'open',
  holders: [ME_HOLDER, MIN_JUN_HOLDER, SEO_YEON_HOLDER],
  subQuests: [
    {
      id: '9a7e0c1d-0000-4f00-8000-0000000a0011',
      attending: false,
      title: '301동 앞에서 만나기',
      startsAt: '2026-10-06T08:40:00.000Z',
      endsAt: null,
      place: { placeId: null, label: '301동 앞', latitude: 37.45091, longitude: 126.95289 },
      completion: 'by_hand',
      cancelled: false,
      done: false,
      ended: false,
    },
    {
      id: '9a7e0c1d-0000-4f00-8000-0000000a0012',
      attending: false,
      title: '피크닉',
      startsAt: '2026-10-06T09:00:00.000Z',
      endsAt: '2026-10-06T11:00:00.000Z',
      place: { placeId: 'pz', label: '자하연', latitude: 37.4607, longitude: 126.9521 },
      completion: 'by_time',
      cancelled: false,
      done: false,
      ended: false,
    },
  ],
  classQuest: false,
  waitingJoinRequests: 0,
  board: 'hobby',
  description: '',
  createdAt: '2026-10-05T10:00:00.000Z',
};

// The same Quest, which 김민준 leads.
export const HIS_PICNIC: Quest = { ...PICNIC, leader: MIN_JUN_HOLDER };

// Its Party, opened by 김민준, as `GET /parties` lists it to a User who is not in it.
export const PICNIC_PARTY: Party = {
  id: '9a7e0c1d-0000-4f00-8000-0000000b0001',
  title: '자하연 피크닉',
  memberCount: 1,
  capacity: 8,
  joinPolicy: 'closed',
  quest: { id: PICNIC.id, title: PICNIC.title, globalEvent: null },
  holdsQuest: true,
  friends: [MIN_JUN_HOLDER],
  leader: { id: MIN_JUN.id, name: MIN_JUN.name },
};

// The Party as the User reads it once in it: the User, 김민준 whom the User sees, and the Leader `leader`.
export function myPicnicParty(leader: string = ME_ID, members: Person[] = [ME_HOLDER, MIN_JUN_HOLDER]): MyParty {
  return {
    id: PICNIC_PARTY.id,
    title: PICNIC_PARTY.title,
    capacity: 8,
    joinPolicy: 'closed',
    quest: PICNIC_PARTY.quest,
    sharing: true,
    members: members.map((member) => ({ ...member, leader: member.id === leader, visible: true })),
  };
}

// The Party of the dinner, which the User is in.
export const DINNER_PARTY_MINE: MyParty = {
  id: '9a7e0c1d-0000-4f00-8000-0000000b0002',
  title: '저녁 먹으러 가요',
  capacity: 4,
  joinPolicy: 'closed',
  quest: { id: DINNER.id, title: DINNER.title, globalEvent: null },
  sharing: true,
  members: [
    { ...MIN_JUN_HOLDER, leader: true, visible: true },
    { ...ME_HOLDER, leader: false, visible: true },
  ],
};

export const NOT_IN_PARTY: Reply = {
  status: 404,
  body: { statusCode: 404, code: 'NOT_IN_PARTY', message: 'The User is in no Party.' },
};

// The User's Party as the fake main server holds it, which the test changes.
export function answerMyParty(server: FakeServer, party: MyParty | null): { set: (next: MyParty | null) => void } {
  let mine = party;
  server.on('GET /parties/mine', () => (mine === null ? NOT_IN_PARTY : { status: 200, body: mine }));
  return {
    set: (next): void => {
      mine = next;
    },
  };
}

// The main screen's answers, and the Quest's own.
export function answerRoom(server: FakeServer, quest: Quest = PICNIC): void {
  answerMainScreen(server);
  server.on('GET /quests', { status: 200, body: [DINNER, quest] });
  server.on(`GET /quests/${quest.id}`, { status: 200, body: quest });
  server.on(`GET /quests/${quest.id}/invitations`, { status: 200, body: [] });
}

type User = ReturnType<typeof userEvent.setup>;

// The main screen, then the Quest's room at its address.
export async function openRoom(quest: Quest = PICNIC): Promise<User> {
  const user = await openMain();
  await act(() => {
    router.push(`/room/${quest.id}`);
  });
  await pass(500);
  return user;
}

export function activationBox(): ReturnType<typeof within> {
  return within(screen.getByLabelText('파티 활성화'));
}

export function toast(): ReturnType<typeof screen.getByTestId> {
  return screen.getByTestId('toast-layer');
}

// Presses a button of the open sheet or dialog, which is drawn last when the room has one of the same name, and lets
// the requests answer.
export async function answer(user: User, name: string): Promise<void> {
  const [button] = screen.getAllByRole('button', { name }).toReversed();
  if (button === undefined) {
    throw new Error(`No button ${name}`);
  }
  await user.press(button);
  await pass(500);
}
