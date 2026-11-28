/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { screen } from './support/app';
import { MY_CAREER } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { MY_HIKE, openAt } from './support/party';
import { answerForm, invite } from './support/party-form';
import { answer, MIN_JUN_HOLDER } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// 수정 of a Quest taken alone (P06 ticket 67, PR 796's review): it stays taken alone, for one, unless the User invites
// a Friend. An edit sends only what changed, so that a change of the title neither gathers it into a 파티 nor drops its
// time to leave. Against the fake main server.

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

function aloneOf(quest: Quest): Quest {
  const [me] = quest.holders;
  return {
    ...quest,
    takenAlone: true,
    seatStay: false,
    capacity: 1,
    joinPolicy: 'closed',
    board: null,
    holders: me === undefined ? [] : [me],
  };
}

// "여기로" on an events Plan: taken alone, for its Global Event.
const EVENT_PLAN = aloneOf(MY_CAREER);
// A meal's Plan for the asker alone, and a Quest the form made alone: no event.
const MEAL_PLAN = aloneOf({ ...MY_HIKE, title: '혼자 점심' });
const FORM_MADE = aloneOf({ ...MY_HIKE, id: '9a7e0c1d-0000-4f00-8000-0000000c0099', title: '혼자 시험 공부' });

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerForm(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function editTitle(quest: Quest, title: string): Promise<void> {
  server.on(`GET /quests/${quest.id}`, { status: 200, body: quest });
  server.on(`PATCH /quests/${quest.id}`, { status: 200, body: { ...quest, title } });
  const user = await openAt(`/party-form?questId=${quest.id}`);
  expect(screen.getByRole('header', { name: '퀘스트 수정' })).toBeVisible();
  expect(screen.queryByRole('button', { name: '인원 늘리기' })).toBeNull();
  await user.clear(screen.getByLabelText('제목'));
  await user.type(screen.getByLabelText('제목'), title);
  await answer(user, '수정 완료');
}

describe('수정 of a Quest taken alone, its title alone changed', () => {
  it.each([
    ['an events Plan Quest, for its Global Event', EVENT_PLAN],
    ["a meal's Plan Quest", MEAL_PLAN],
    ['a Quest the form made alone', FORM_MADE],
  ])('sends the title alone for %s: it stays alone, for one', async (_kind, quest) => {
    await editTitle(quest, '새 제목');

    expect(server.received(`PATCH /quests/${quest.id}`).map(({ body }) => body)).toEqual([{ title: '새 제목' }]);
  });
});

describe('수정 of a Quest taken alone, a Friend invited', () => {
  it('shows 인원 and gathers it: the 인원 for the User and the Friend, then the invitation', async () => {
    server.on(`GET /quests/${EVENT_PLAN.id}`, { status: 200, body: EVENT_PLAN });
    server.on(`PATCH /quests/${EVENT_PLAN.id}`, {
      status: 200,
      body: { ...EVENT_PLAN, takenAlone: false, capacity: 4 },
    });
    server.on(`POST /quests/${EVENT_PLAN.id}/invitations`, { status: 204 });
    const user = await openAt(`/party-form?questId=${EVENT_PLAN.id}`);

    await invite(user, [MIN_JUN_HOLDER.name]);
    expect(screen.getByRole('button', { name: '인원 늘리기' })).toBeVisible();
    await answer(user, '수정 완료');

    expect(server.received(`PATCH /quests/${EVENT_PLAN.id}`).map(({ body }) => body)).toEqual([{ capacity: 4 }]);
    expect(server.received(`POST /quests/${EVENT_PLAN.id}/invitations`)).toHaveLength(1);
  });
});
