/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { STUDY_GROUP_TO_SEND, type StudyAnswer } from '@/api/mock/data/study-group-answers';
import type { RoomRequest } from '@/api/room-requests';
import type { Quest, QuestRoomRequest } from '@/api/types';
import type { StudyGroup } from '@/api/study-plan-types';
import { markLibraryLoggedIn } from '@/library/flag';
import type { FakeServer } from './fake-server';
import type { FakeLibrary } from './kwanjeong/fake-library';
import { pass, screen } from './app';
import { inDock, inFrame, type LibraryChat, sendFromBar } from './library-chat';
import { openMain } from './main';
import { DINNER } from './server';

// The study answer together (P10 tickets 11 to 14) on the answer screen, against the fake main server and the fake
// library: the server's fixtures, asked on Wednesday 2026-11-04 at 19:10 for the next day from 15:00 to 17:00.

export const ASKED_AT = new Date('2026-11-04T10:10:00.000Z');

// The model's words of the answer to send.
export const SAID = '네 명이 모두 비는 내일 15:00에 관정 4층 6인실을 추천해요.';

// The first room of 4F-group-6 free from 15:00 to 17:00 on 2026-11-05 in the fake library's recorded list.
export const FIRST_FREE = 'G405';

// The map's label of the answer's room: the study pick's make-up (P01 ticket 10), the kind and the people under it.
export const ROOM_MARK = '관정 4층 그룹스터디룸 · 15:00 · 6인실 · 4명';

// Every kind grey for one person, with its least.
function noneFitting(rooms: StudyGroup['rooms']): StudyGroup['rooms'] {
  return rooms.map(({ spaceId, floor, name, capacity, space }) => ({
    spaceId,
    floor,
    name,
    capacity,
    space,
    fits: false,
    reason: `${String(capacity.min)}명부터`,
  }));
}

// "같이 공부할 자리 있어?" with no Friend named: the answer for the asker alone, three more needed, the three Friends of
// the fixture to pick in the time card. The server gives it so (P10 ticket 07); its fixtures hold no copy of it.
export function askerAlone(): StudyAnswer {
  const [plan] = STUDY_GROUP_TO_SEND.plans;
  const group = plan?.study?.group;
  if (plan === undefined || group === undefined) {
    throw new Error('The answer to send has no group');
  }
  const [me, ...friends] = plan.band.lanes;
  const [asker] = STUDY_GROUP_TO_SEND.input.people;
  return {
    ...STUDY_GROUP_TO_SEND,
    input: { ...STUDY_GROUP_TO_SEND.input, people: asker === undefined ? [] : [asker] },
    chips: [],
    plans: [
      {
        ...plan,
        parts: plan.parts.slice(0, 1),
        band: {
          ...plan.band,
          lanes: me === undefined ? [] : [me],
          others: friends.map(({ userId, name, busy }) => ({ userId, name, busy, walkMinutes: null })),
        },
        scene: {
          ...plan.scene,
          people: plan.scene.people.slice(0, 1),
          routes: plan.scene.routes.filter(({ userId }) => userId === asker?.userId),
        },
        study: {
          ...plan.study,
          spaces: [],
          book: null,
          liveSeats: 'kwanjeong',
          group: {
            ...group,
            people: 1,
            moreNeeded: 3,
            key: null,
            rooms: noneFitting(group.rooms),
          },
        },
      },
    ],
  };
}

// The answer asked from the map's bar, as the Assistant's reply with it; the library logged in unless said.
export async function askTogether(
  given: { server: FakeServer; library: FakeLibrary },
  answer: StudyAnswer,
  { loggedIn = true, words = '민수, 서연, 지은이랑 같이 공부할 자리 있어?', said = SAID } = {},
): Promise<LibraryChat> {
  if (loggedIn) {
    await markLibraryLoggedIn();
  }
  const body = { text: said, mapButtons: [], cards: [], proposal: null, answer };
  given.server.on('POST /assistant/messages', { status: 200, body });
  const user = await openMain();
  await sendFromBar(user, words);
  return { ...given, user };
}

// The room request of the answer to send, as GET /library/room-requests/:id gives it (P10 tickets 12 and 14).
export const REQUEST_ID = 'dddddddd-0000-4000-8000-000000000001';
export const QUEST_ID = 'eeeeeeee-0000-4000-8000-000000000001';
export const FRIENDS = [
  { userId: 'a3f1c2d4-0000-4000-8000-0000000000a1', name: '박민수' },
  { userId: 'a3f1c2d4-0000-4000-8000-0000000000a2', name: '이서연' },
  { userId: 'a3f1c2d4-0000-4000-8000-0000000000a3', name: '김지은' },
];

type State = 'asked' | 'consented' | 'declined';

export function requestOf(
  states: readonly State[],
  moreNeeded = 0,
  status: RoomRequest['status'] = 'gathering',
): RoomRequest {
  const companions = FRIENDS.map(({ userId, name }, index) => ({ userId, name, state: states[index] ?? 'asked' }));
  return {
    id: REQUEST_ID,
    status,
    questId: QUEST_ID,
    madeForBooking: true,
    requester: { userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: '나' },
    space: { id: '4F-group-6', name: '그룹스터디룸 6인실' },
    date: '2026-11-05',
    start: '15:00',
    minutes: 120,
    useDesc: '과제',
    reason: null,
    failed: null,
    consents: companions.map(({ userId, name, state }) => ({
      userId,
      name,
      consented: state === 'asked' ? null : state === 'consented',
    })),
    companions,
    moreNeeded,
  };
}

export type User = LibraryChat['user'];

// The answer to send asked, its use 과제 chosen, and "동의 요청 보내기" pressed.
export async function sendTogether(given: { server: FakeServer; library: FakeLibrary }): Promise<User> {
  const { user } = await askTogether(given, STUDY_GROUP_TO_SEND);
  await pass(500);
  await user.press(screen.getByTestId('room-use-line'));
  await user.press(inFrame().getByRole('button', { name: '과제' }));
  await user.press(inDock().getByRole('button', { name: '동의 요청 보내기' }));
  await pass(500);
  return user;
}

// The booking party the request made, as GET /quests gives it with its request (P10 ticket 13): the User leads it, the
// Friends invited, at 관정관 for the request's time.
export function bookingParty(roomRequest: QuestRoomRequest | null): Quest {
  const [me] = DINNER.holders;
  const [step] = DINNER.subQuests;
  if (me === undefined || step === undefined) {
    throw new Error('The dinner has no Holder or step');
  }
  return {
    ...DINNER,
    id: QUEST_ID,
    title: '관정 그룹스터디룸 6인실 예약',
    capacity: 4,
    holders: [me],
    subQuests: [
      {
        ...step,
        id: 'eeeeeeee-0000-4000-8000-000000000002',
        title: '관정 그룹스터디룸 6인실 예약',
        startsAt: '2026-11-05T06:00:00.000Z',
        endsAt: '2026-11-05T08:00:00.000Z',
        place: { placeId: '62-1', label: '관정도서관', latitude: 37.45962, longitude: 126.95168 },
      },
    ],
    roomRequest,
  };
}
