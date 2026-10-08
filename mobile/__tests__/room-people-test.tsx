import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import {
  answer,
  answerMyParty,
  answerRoom,
  HIS_PICNIC,
  ME_HOLDER,
  MIN_JUN_HOLDER,
  myPicnicParty,
  openRoom,
  PICNIC,
  SEO_YEON_HOLDER,
  toast,
} from './support/room';
import { askMainServer, JI_WOO, JOIN_REQUESTS, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// The room's 신청, 초대 중 and 멤버, and leaving it, against the fake main server.

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

const QUEST = `/quests/${PICNIC.id}`;
const APPROVAL = { ...PICNIC, joinPolicy: 'approval' as const };
const JI_WOO_HOLDER = { id: JI_WOO.id, name: JI_WOO.name, department: JI_WOO.department };
const INVITATION = { id: 'qi9', user: JI_WOO_HOLDER, sentAt: '2026-10-06T03:50:00.000Z' };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function section(name: string): ReturnType<typeof within> {
  return within(screen.getByLabelText(name));
}

describe('신청', () => {
  beforeEach(() => {
    answerRoom(server, APPROVAL);
    server.on(`GET ${QUEST}/join-requests`, { status: 200, body: JOIN_REQUESTS });
  });

  it('lists the requests to join for the Leader of an Approval Quest, and accepts one', async () => {
    server.on(`POST ${QUEST}/join-requests/jr1/accept`, { status: 204 });
    const user = await openRoom(APPROVAL);

    expect(section('참여 신청').getByRole('header', { name: '신청 2' })).toBeVisible();
    expect(section('참여 신청').getByText('20분 전')).toBeVisible();
    expect(section('참여 신청').getByText('10분 전')).toBeVisible();
    await user.press(section('참여 신청').getAllByRole('button', { name: '수락' })[0]);
    await pass(500);

    expect(server.received(`POST ${QUEST}/join-requests/jr1/accept`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('윤태오님을 멤버로 추가했어요');
  });

  it('declines one', async () => {
    server.on(`POST ${QUEST}/join-requests/jr2/decline`, { status: 204 });
    const user = await openRoom(APPROVAL);

    await user.press(section('참여 신청').getAllByRole('button', { name: '거절' })[1]);
    await pass(500);

    expect(server.received(`POST ${QUEST}/join-requests/jr2/decline`)).toHaveLength(1);
  });

  it('says that the Quest is full', async () => {
    server.on(`POST ${QUEST}/join-requests/jr1/accept`, refusal(409, 'QUEST_FULL'));
    const user = await openRoom(APPROVAL);

    await user.press(section('참여 신청').getAllByRole('button', { name: '수락' })[0]);
    await pass(500);

    expect(toast()).toHaveTextContent('자리가 다 찼어요');
  });
});

describe('초대 중', () => {
  it("lists the Leader's invitations and cancels one", async () => {
    server.on(`GET ${QUEST}/invitations`, { status: 200, body: [INVITATION] });
    server.on(`DELETE ${QUEST}/invitations/qi9`, { status: 204 });
    const user = await openRoom();

    expect(section('초대 중').getByRole('header', { name: '초대 중 1' })).toBeVisible();
    expect(section('초대 중').getByText('10분 전')).toBeVisible();
    await user.press(section('초대 중').getByRole('button', { name: '초대 취소' }));
    await pass(500);

    expect(server.received(`DELETE ${QUEST}/invitations/qi9`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('서지우님 초대를 취소했어요');
  });

  it('says that an invitation ended, and fetches the list again', async () => {
    server.on(`GET ${QUEST}/invitations`, { status: 200, body: [INVITATION] });
    server.on(`DELETE ${QUEST}/invitations/qi9`, refusal(404, 'QUEST_INVITATION_NOT_FOUND'));
    const user = await openRoom();
    const before = server.received(`GET ${QUEST}/invitations`).length;

    await user.press(screen.getByRole('button', { name: '초대 취소' }));
    await pass(500);

    expect(toast()).toHaveTextContent('이미 끝난 초대예요');
    expect(server.received(`GET ${QUEST}/invitations`).length).toBeGreaterThan(before);
  });

  it('is not shown to another Holder', async () => {
    answerRoom(server, HIS_PICNIC);

    await openRoom(HIS_PICNIC);

    expect(screen.queryByLabelText('초대 중')).toBeNull();
    expect(server.received(`GET ${QUEST}/invitations`)).toEqual([]);
  });
});

// The User leads the Party; 김민준 shares, 서지우 does not, and 이서연 has not entered.
const PARTY_WITH_JI_WOO = {
  ...myPicnicParty(ME_ID, [ME_HOLDER, MIN_JUN_HOLDER, JI_WOO_HOLDER]),
  members: [
    { ...ME_HOLDER, leader: true, visible: true },
    { ...MIN_JUN_HOLDER, leader: false, visible: true },
    { ...JI_WOO_HOLDER, leader: false, visible: false },
  ],
};
const WITH_JI_WOO = { ...PICNIC, capacity: 6, holders: [...PICNIC.holders, JI_WOO_HOLDER] };

describe('멤버', () => {
  beforeEach(() => {
    answerRoom(server, WITH_JI_WOO);
  });

  it('shows what the User sees of each Holder while in the Party', async () => {
    answerMyParty(server, PARTY_WITH_JI_WOO);
    await openRoom(WITH_JI_WOO);

    expect(section('멤버').getByRole('header', { name: '멤버 4' })).toBeVisible();
    expect(section('멤버').getByText('2자리 남음')).toBeVisible();
    expect(section('멤버').getByLabelText('파티장')).toBeVisible();
    expect(section('멤버').getByRole('button', { name: '김민준 · 위치 공유 중' })).toBeVisible();
    expect(section('멤버').getByRole('button', { name: '서지우 · 위치 꺼짐' })).toBeVisible();
    expect(section('멤버').getByRole('button', { name: '이서연 · 응답 대기' })).toBeVisible();
    // The User's own row too.
    expect(section('멤버').getAllByText('위치 공유 중')).toHaveLength(2);
  });

  it("says that the User's sharing is paused", async () => {
    answerMyParty(server, { ...PARTY_WITH_JI_WOO, sharing: false });

    await openRoom(WITH_JI_WOO);

    expect(section('멤버').getByText('공유 일시정지')).toBeVisible();
  });
});

describe("the Leader's controls of 멤버", () => {
  beforeEach(() => {
    answerRoom(server, WITH_JI_WOO);
  });

  it('removes a Holder from the Quest and from the Party the User leads', async () => {
    answerMyParty(server, PARTY_WITH_JI_WOO);
    server.on(`DELETE ${QUEST}/holders/${MIN_JUN.id}`, { status: 204 });
    server.on(`DELETE /parties/mine/members/${MIN_JUN.id}`, { status: 204 });
    const user = await openRoom(WITH_JI_WOO);

    await user.press(section('멤버').getAllByRole('button', { name: '내보내기' })[0]);
    await pass(500);

    expect(server.received(`DELETE ${QUEST}/holders/${MIN_JUN.id}`)).toHaveLength(1);
    expect(server.received(`DELETE /parties/mine/members/${MIN_JUN.id}`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('김민준님을 내보냈어요');
  });

  it('hands the role over after the dialog', async () => {
    server.on(`PUT ${QUEST}/leader`, { status: 204 });
    const user = await openRoom(WITH_JI_WOO);

    await user.press(section('멤버').getAllByRole('button', { name: '파티장 넘기기' })[0]);
    expect(screen.getByRole('header', { name: '김민준님에게 파티장을 넘길까요?' })).toBeVisible();
    await answer(user, '넘기기');

    expect(server.received(`PUT ${QUEST}/leader`).map(({ body }) => body)).toEqual([{ userId: MIN_JUN.id }]);
    expect(toast()).toHaveTextContent('김민준님이 파티장이 됐어요');
  });

  it('shows a member the User sees on the map with the card, and says so for one the User does not see', async () => {
    const user = await openRoom(WITH_JI_WOO);

    await user.press(section('멤버').getByRole('button', { name: '서지우' }));
    expect(toast()).toHaveTextContent('서지우님은 위치가 꺼져 있어요');

    await user.press(section('멤버').getByRole('button', { name: '김민준' }));
    await pass(500);
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(within(screen.getByTestId('map-card')).getByText('김민준')).toBeVisible();
  });
});

describe('leaving the room', () => {
  it.each([
    ['in the Party', myPicnicParty(MIN_JUN.id), ['POST /parties/mine/leave', `DELETE ${QUEST}`]],
    ['in no Party', null, [`DELETE ${QUEST}`]],
  ])('drops the Quest for a Holder %s, and goes back', async (_where, mine, requests) => {
    answerRoom(server, HIS_PICNIC);
    answerMyParty(server, mine);
    server.on('POST /parties/mine/leave', { status: 204 });
    server.on(`DELETE ${QUEST}`, { status: 204 });
    const user = await openRoom(HIS_PICNIC);

    await user.press(screen.getByRole('button', { name: '나가기' }));
    expect(screen.getByRole('header', { name: '파티에서 나갈까요?' })).toBeVisible();
    expect(
      screen.getByText(
        mine === null
          ? '내 파티 목록에서 사라져요.'
          : '내 파티 목록에서 사라져요. 활성화 중이라 위치 공유도 바로 멈춰요.',
      ),
    ).toBeVisible();
    await answer(user, '나가기');

    expect(
      server
        .received()
        .map(({ method, path }) => `${method} ${path}`)
        .filter((route) => requests.includes(route)),
    ).toEqual(requests);
    expect(toast()).toHaveTextContent('파티에서 나왔어요');
    expect(shownAddress()).toBe('/main');
  });
});

describe('ending the Quest from the room', () => {
  it.each([
    ['leading the Party', myPicnicParty(ME_ID), ['POST /parties/mine/end', `POST ${QUEST}/end`]],
    ['only in the Party', myPicnicParty(MIN_JUN.id), ['POST /parties/mine/leave', `POST ${QUEST}/end`]],
    ['in no Party', null, [`POST ${QUEST}/end`]],
  ])('ends the Quest for every Holder, the Leader %s', async (_where, mine, requests) => {
    answerMyParty(server, mine);
    server.on('POST /parties/mine/end', { status: 204 });
    server.on('POST /parties/mine/leave', { status: 204 });
    server.on(`POST ${QUEST}/end`, { status: 204 });
    const user = await openRoom();

    await user.press(screen.getByRole('button', { name: '파티 없애기' }));
    expect(screen.getByRole('header', { name: '파티를 없앨까요?' })).toBeVisible();
    await answer(user, '파티 없애기');

    const asked = server.received().map(({ method, path }) => `${method} ${path}`);
    expect(asked.filter((route) => route.startsWith('POST'))).toEqual(['POST /lobby', ...requests]);
    expect(toast()).toHaveTextContent('파티를 없앴어요');
    expect(shownAddress()).toBe('/main');
  });
});

describe('the members that every Holder sees', () => {
  it('lists the Holders without states while the User is in no Party', async () => {
    answerRoom(server, { ...PICNIC, holders: [ME_HOLDER, MIN_JUN_HOLDER, SEO_YEON_HOLDER] });

    await openRoom();

    expect(section('멤버').getByRole('button', { name: '김민준' })).toBeVisible();
    expect(section('멤버').queryByText('응답 대기')).toBeNull();
  });
});
