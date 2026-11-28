/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { answered, startFresh } from '../support/mocks';
import { answerMainScreen, askMainServer, INVITATION, PHONE_NOW, STUDY } from '../support/server';
import { apiClient } from '@/api/client';
import type { RecruitingQuest } from '@/api/party-types';
import { googleAvailable } from '@/auth/google';

// The mocked part of a Quest, which the client adds to its answers: the members' faces. A Quest has no photo or tags:
// the main server keeps none, and the stand-ins went (P06 ticket 34).

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

// A post of four Holders on the main server, of which the summary names the Leader alone.
const RUNNING: RecruitingQuest = {
  id: '9a7e0c1d-0000-4f00-8000-00000000a001',
  title: '저녁 러닝',
  globalEvent: null,
  leader: { id: '6d1c3f5e-3333-4a5b-8c9d-000000000003', name: '한도경', department: '산업공학과' },
  holderCount: 4,
  capacity: 8,
  joinPolicy: 'open',
  board: 'hobby',
  description: '버들골 한 바퀴 뛰어요.',
  createdAt: '2026-10-06T03:00:00.000Z',
  nextSubQuest: {
    id: '9a7e0c1d-0000-4f00-8000-00000000a002',
    title: '저녁 러닝',
    startsAt: '2026-10-06T10:30:00.000Z',
    endsAt: null,
    place: { placeId: null, label: '버들골', latitude: 37.4598, longitude: 126.9521 },
  },
};

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('in the build that asks the main server', () => {
  it('adds no photo, no tags and no invented people', async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);
    server.on('GET /quests/recruiting', { status: 200, body: [RUNNING] });
    server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });

    const [post] = await apiClient.listRecruitingQuests();
    const [invitation] = await apiClient.listQuestInvitations();
    const [dinner] = await apiClient.listQuests();

    for (const shown of [post, invitation?.quest, dinner]) {
      expect(shown).not.toHaveProperty('photo');
      expect(shown).not.toHaveProperty('tags');
    }
    expect(post?.faces).toEqual([{ name: '한도경', photo: null }]);
    expect(invitation?.quest.faces).toEqual([{ name: '윤태오', photo: null }]);
    expect(dinner?.faces).toEqual([
      { name: '홍길동', photo: null },
      { name: '김민준', photo: null },
    ]);
  });
});

describe('what the User makes, in the build that asks the main server', () => {
  it('is the Quest the main server answers with, its Holders as faces', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /quests/own', { status: 201, body: STUDY });
    server.on('POST /quests', { status: 201, body: STUDY });

    const made = await apiClient.makeQuest(
      {
        title: STUDY.title,
        description: '',
        capacity: 6,
        joinPolicy: 'approval',
        board: 'career',
        subQuest: { title: STUDY.title },
      },
      'key-1',
    );
    const attended = await apiClient.attendGlobalEvent('event-1');

    expect(server.received('POST /quests')[0]?.body).toEqual({ globalEventId: 'event-1' });
    for (const quest of [made, attended]) {
      expect(quest).toEqual({ ...STUDY, faces: STUDY.holders.map(({ name }) => ({ name, photo: null })) });
    }
  });
});

describe('in the mock build', () => {
  it("gives the frame's posts their three members", async () => {
    const posts = await answered(apiClient.listRecruitingQuests());

    expect(posts.find(({ title }) => title === '버들골 저녁 러닝 크루')).toMatchObject({
      faces: [
        { name: '최유나', photo: null },
        { name: '서하린', photo: null },
        { name: '강민재', photo: null },
      ],
    });
    expect(posts.find(({ title }) => title === '풋살 한 판 뛰실 분')).toMatchObject({
      faces: [{ name: '엄태현' }, { name: '박소율' }, { name: '정우진' }],
    });
  });

  it("gives an invitation its Leader and companions, and the User's Quests their Holders", async () => {
    const [invitation] = await answered(apiClient.listQuestInvitations());
    const quests = await answered(apiClient.listQuests());

    expect(invitation?.quest).toMatchObject({ faces: [{ name: '윤태오', photo: null }] });
    expect(quests.find(({ id }) => id === 'q-ai')).toMatchObject({
      faces: [{ name: '김민준' }, { name: '안진영' }, expect.objectContaining({ photo: null })],
    });
  });
});

describe("an invitation's time and place, and the past Quests", () => {
  const ME = { id: 'me', name: '안진영', department: '컴퓨터공학부' };

  it("gives in the mock build the frame's time and place: two days ahead at 14:00, at the library", async () => {
    const [invitation] = await answered(apiClient.listQuestInvitations());

    expect(invitation?.nextSubQuest).toMatchObject({
      startsAt: '2026-10-03T05:00:00.000Z',
      place: { placeId: null, label: '중앙도서관 (62동)' },
    });
  });

  it("carries the main server's time and place, and leaves out the companions, in the build that asks it", async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /quest-invitations', {
      status: 200,
      body: [{ ...INVITATION, quest: { ...INVITATION.quest, holderCount: 3 } }],
    });

    const [invitation] = await apiClient.listQuestInvitations();

    expect(invitation?.nextSubQuest).toEqual(INVITATION.nextSubQuest);
    expect(invitation?.quest.faces).toEqual([{ name: '윤태오', photo: null }]);
  });

  it('gives in the mock build the past Quests, held by the User and started before today', async () => {
    const past = await answered(apiClient.listPastQuests(ME));

    expect(past.map(({ title }) => title)).toEqual(['자료구조 중간고사 스터디', '버들골 저녁 러닝']);
    for (const quest of past) {
      expect(quest.holders).toContainEqual(ME);
      expect(new Date(quest.subQuests[0]?.startsAt ?? '').getTime()).toBeLessThan(PHONE_NOW.getTime());
    }
  });

  it('gives no past Quest in the build that asks the main server', async () => {
    await askMainServer({ signedIn: true });

    await expect(apiClient.listPastQuests(ME)).resolves.toEqual([]);
  });
});
