import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { FULL_SCREEN } from './support/lists';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { answerMeetups, ENGINEERING, LUNCH, openInvites, SHARED, STUDY } from './support/meetups';
import { startFresh } from './support/mocks';
import { answer, answerRoom, ME_HOLDER, openRoom, toast } from './support/room';
import { answerMainScreen, askMainServer, DINNER, PHONE_NOW } from './support/server';

// The 초대 tab's Meetups and the Shared Quest of an accepted one, against the fake main server and socket.

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

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /places', { status: 200, body: [ENGINEERING] });
  server.on('GET /places/search', { status: 200, body: [ENGINEERING] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function meetupsAsked(): number {
  return server.received('GET /meetups').length;
}

describe('a received Meetup', () => {
  it('is accepted: the toast, the card gone, and after quests-changed the Shared Quest in the Quest lists', async () => {
    answerMeetups(server, [LUNCH]);
    server.on(`POST /meetups/${LUNCH.id}/accept`, { status: 204 });
    const user = await openInvites();
    expect(screen.getByRole('header', { name: '받은 초대 · 1' })).toBeVisible();
    for (const words of ['이서연님이 비공개 파티에 초대했어요', '학관 점심', '오늘 18:00 · 학생회관']) {
      expect(screen.getByText(words)).toBeVisible();
    }
    expect(screen.getByText('멤버가 파티를 활성화하면, 수락한 멤버끼리 위치를 공유해요.')).toBeVisible();
    await socketServer((socket) => {
      socket.accept();
    });

    answerMeetups(server, []);
    await answer(user, '수락');
    expect(toast()).toHaveTextContent('파티에 참여했어요');
    expect(screen.getByText('받은 초대가 없어요')).toBeVisible();
    server.on('GET /quests', { status: 200, body: [DINNER, SHARED] });
    await socketServer((socket) => {
      socket.send('quests-changed');
    });
    await pass(100);

    await user.press(screen.getByRole('tab', { name: '지도' }));
    expect(screen.getByRole('button', { name: '비공개 파티 · 이서연 · 학관 점심 · 18:00 · 학생회관' })).toBeVisible();
    await user.press(screen.getByRole('button', { name: FULL_SCREEN }));
    await pass(0);
    expect(screen.getByRole('button', { name: '비공개 파티 · 이서연 · 학관 점심 · 학생회관 · 18:00' })).toBeVisible();
  });
});

describe('a received Meetup declined', () => {
  it('is declined without a toast', async () => {
    answerMeetups(server, [LUNCH]);
    server.on(`POST /meetups/${LUNCH.id}/decline`, { status: 204 });
    const user = await openInvites();

    answerMeetups(server, []);
    await answer(user, '거절');

    expect(server.received(`POST /meetups/${LUNCH.id}/decline`)).toHaveLength(1);
    expect(screen.getByText('받은 초대가 없어요')).toBeVisible();
    expect(screen.queryByText('파티에 참여했어요')).toBeNull();
  });

  it.each([
    ['수락', 'accept', refusal(409, 'MEETUP_NOT_PROPOSED')],
    ['수락', 'accept', refusal(404, 'MEETUP_NOT_FOUND')],
    ['거절', 'decline', refusal(409, 'MEETUP_NOT_PROPOSED')],
    ['거절', 'decline', refusal(404, 'MEETUP_NOT_FOUND')],
  ])('says that %s came too late, and fetches the Meetups again: %s %j', async (button, route, reply) => {
    answerMeetups(server, [LUNCH]);
    server.on(`POST /meetups/${LUNCH.id}/${route}`, reply);
    const user = await openInvites();
    const before = meetupsAsked();

    await answer(user, button);

    expect(toast()).toHaveTextContent('이미 취소됐거나 지난 초대예요');
    expect(meetupsAsked()).toBeGreaterThan(before);
  });
});

describe('a sent Meetup', () => {
  it('is listed with its state and the note, without the withdrawn and the long past ones', async () => {
    answerMeetups(
      server,
      [],
      [
        STUDY,
        { ...STUDY, id: 'mu4', state: 'withdrawn' },
        { ...STUDY, id: 'mu5', state: 'expired', startsAt: '2026-09-28T03:00:00.000Z', endsAt: null },
      ],
    );
    await openInvites();

    expect(screen.getByText('받은 초대가 없어요')).toBeVisible();
    expect(screen.getByRole('header', { name: '보낸 초대 · 1' })).toBeVisible();
    expect(screen.getByText('보낸 초대는 고칠 수 없어요. 바꾸려면 초대를 취소하고 다시 보내 주세요.')).toBeVisible();
    for (const words of ['김민준님에게 보낸 초대', '같이 공부', '내일 12:00–13:00 · 학생회관', '응답 대기']) {
      expect(screen.getByText(words)).toBeVisible();
    }
  });
});

describe('a sent Meetup withdrawn', () => {
  it('is withdrawn', async () => {
    answerMeetups(server, [], [STUDY]);
    server.on(`POST /meetups/${STUDY.id}/withdraw`, { status: 204 });
    const user = await openInvites();

    answerMeetups(server, [], [{ ...STUDY, state: 'withdrawn' }]);
    await answer(user, '초대 취소');

    expect(toast()).toHaveTextContent('김민준님 초대를 취소했어요');
    expect(screen.queryByRole('header', { name: '보낸 초대 · 1' })).toBeNull();
  });

  it('says that it was answered meanwhile, and fetches the Meetups again', async () => {
    answerMeetups(server, [], [STUDY]);
    server.on(`POST /meetups/${STUDY.id}/withdraw`, refusal(409, 'MEETUP_NOT_PROPOSED'));
    const user = await openInvites();
    const before = meetupsAsked();

    await answer(user, '초대 취소');

    expect(toast()).toHaveTextContent('이미 답한 초대예요');
    expect(meetupsAsked()).toBeGreaterThan(before);
  });
});

describe("a sent Meetup's Badge", () => {
  it('changes as meetups-changed arrives', async () => {
    answerMeetups(server, [], [STUDY]);
    await openInvites();
    await socketServer((socket) => {
      socket.accept();
    });
    expect(screen.getByText('응답 대기')).toBeVisible();

    for (const [state, words] of [
      ['accepted', '수락함'],
      ['declined', '거절함'],
      ['expired', '기간 지남'],
    ] as const) {
      answerMeetups(server, [], [{ ...STUDY, state }]);
      // One signal after the other, as the main server sends them.
      // oxlint-disable-next-line no-await-in-loop
      await socketServer((socket) => {
        socket.send('meetups-changed');
      });
      // oxlint-disable-next-line no-await-in-loop
      await pass(100);
      expect(screen.getByText(words)).toBeVisible();
      expect(screen.queryByRole('button', { name: '초대 취소' })).toBeNull();
    }
  });
});

describe('the Shared Quest', () => {
  it("changes this User's row when the other Friend drops it", async () => {
    server.on('GET /quests', { status: 200, body: [DINNER, SHARED] });
    await openMain();
    await socketServer((socket) => {
      socket.accept();
    });
    expect(screen.getByRole('button', { name: '비공개 파티 · 이서연 · 학관 점심 · 18:00 · 학생회관' })).toBeVisible();

    server.on('GET /quests', {
      status: 200,
      body: [DINNER, { ...SHARED, leader: ME_HOLDER, holders: [ME_HOLDER] }],
    });
    await socketServer((socket) => {
      socket.send('quests-changed');
    });
    await pass(100);

    expect(screen.getByRole('button', { name: '퀘스트 · 학관 점심 · 18:00 · 학생회관' })).toBeVisible();
  });

  it("is dropped by this User through the room's footer", async () => {
    answerRoom(server, SHARED);
    server.on(`DELETE /quests/${SHARED.id}`, { status: 204 });
    const user = await openRoom(SHARED);

    await user.press(screen.getByRole('button', { name: '나가기' }));
    await answer(user, '나가기');

    expect(server.received(`DELETE /quests/${SHARED.id}`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('파티에서 나왔어요');
  });
});
