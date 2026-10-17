/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { answered, startFresh } from '../support/mocks';
import { answerMainScreen, askMainServer, DINNER, INVITATION, LOBBY, PHONE_NOW, STUDY } from '../support/server';
import { apiClient } from '@/api/client';
import { PHOTO_SET, TAG_SET } from '@/api/mock/data/quest-parts';
import type { RecruitingQuest } from '@/api/party-types';
import type { QuestPhoto } from '@/api/quest-parts-types';
import { googleAvailable } from '@/auth/google';

// The mocked parts of a Quest, which the client adds to its answers: a photo, tags and the members' faces.

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

const PICKED: QuestPhoto = { kind: 'picked', uri: 'file:///photos/run.jpg', caption: '' };

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
  it('adds photos and tags from the mock sets, and no invented people', async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);
    server.on('GET /quests/recruiting', { status: 200, body: [RUNNING] });
    server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });

    const [post] = await apiClient.listRecruitingQuests();
    const [invitation] = await apiClient.listQuestInvitations();
    const [dinner] = await apiClient.listQuests();

    for (const shown of [post, invitation?.quest, dinner]) {
      expect(PHOTO_SET).toContainEqual(shown?.photo);
      expect(TAG_SET).toContainEqual(shown?.tags);
    }
    expect(post?.faces).toEqual([{ name: '한도경', photo: null }]);
    expect(invitation?.quest.faces).toEqual([{ name: '윤태오', photo: null }]);
    expect(dinner?.faces).toEqual([
      { name: '홍길동', photo: null },
      { name: '김민준', photo: null },
    ]);
  });

  it("gives the profile's hashtags as the User's tags", async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /users/me/profile', { status: 200, body: { ...LOBBY.profile, hashtags: [] } });

    await expect(apiClient.listMyTags()).resolves.toEqual([]);
  });

  it('gives the same Quest the same photo and tags in every answer', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /quests/recruiting', { status: 200, body: [RUNNING] });
    server.on(`GET /quests/${RUNNING.id}`, { status: 200, body: { ...DINNER, id: RUNNING.id } });

    const [first] = await apiClient.listRecruitingQuests();
    const [again] = await apiClient.listRecruitingQuests();
    const quest = await apiClient.getQuest(RUNNING.id);

    expect(again?.photo).toEqual(first?.photo);
    expect(again?.tags).toEqual(first?.tags);
    expect(quest.photo).toEqual(first?.photo);
    expect(quest.tags).toEqual(first?.tags);
  });
});

describe('what the User enters in the build that asks the main server', () => {
  it('keeps the photo and tags of a Quest the User made on the phone, and gives them back with it', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /quests/own', { status: 201, body: STUDY });
    server.on('GET /quests', { status: 200, body: [DINNER, STUDY] });

    const made = await apiClient.makeQuest(
      {
        title: STUDY.title,
        description: '',
        capacity: 6,
        joinPolicy: 'approval',
        board: 'career',
        subQuest: { title: STUDY.title },
        photo: PICKED,
        tags: ['알고리즘', '스터디'],
      },
      'key-1',
    );
    const study = (await apiClient.listQuests()).find(({ id }) => id === STUDY.id);

    expect(server.received('POST /quests/own')[0]?.body).not.toHaveProperty('photo');
    expect(server.received('POST /quests/own')[0]?.body).not.toHaveProperty('tags');
    expect(made).toMatchObject({ photo: PICKED, tags: ['알고리즘', '스터디'] });
    expect(study).toMatchObject({ photo: PICKED, tags: ['알고리즘', '스터디'] });
  });
  it('keeps changed tags on the phone without asking the main server to change anything', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(`GET /quests/${STUDY.id}`, { status: 200, body: STUDY });

    const changed = await apiClient.changeQuest(STUDY.id, { tags: ['코딩테스트'] });
    const again = await apiClient.getQuest(STUDY.id);

    expect(server.received(`PATCH /quests/${STUDY.id}`)).toEqual([]);
    expect(changed.tags).toEqual(['코딩테스트']);
    expect(again).toMatchObject({ photo: null, tags: ['코딩테스트'] });
  });
});

describe('a Quest the User makes for an event, in the build that asks the main server', () => {
  it('gets no mocked photo or tags, and keeps the ones given', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /quests', { status: 201, body: STUDY });

    const bare = await apiClient.attendGlobalEvent('event-1');
    expect(bare).toMatchObject({ photo: null, tags: [] });

    const given = await apiClient.attendGlobalEvent('event-1', undefined, { photo: PICKED, tags: ['공연'] });
    expect(server.received('POST /quests')[1]?.body).toEqual({ globalEventId: 'event-1' });
    expect(given).toMatchObject({ photo: PICKED, tags: ['공연'] });
  });
});

describe('in the mock build', () => {
  it("gives the frame's posts with their photo, tags and three members", async () => {
    const posts = await answered(apiClient.listRecruitingQuests());

    expect(posts.find(({ title }) => title === '버들골 저녁 러닝 크루')).toMatchObject({
      photo: { kind: 'drawn', caption: '지난주 버들골 러닝' },
      tags: ['러닝', '운동'],
      faces: [
        { name: '최유나', photo: null },
        { name: '서하린', photo: null },
        { name: '강민재', photo: null },
      ],
    });
    expect(posts.find(({ title }) => title === '풋살 한 판 뛰실 분')).toMatchObject({
      photo: null,
      tags: ['풋살', '운동'],
      faces: [{ name: '엄태현' }, { name: '박소율' }, { name: '정우진' }],
    });
  });

  it("gives an invitation its Leader and companions, and the User's Quests their Holders", async () => {
    const [invitation] = await answered(apiClient.listQuestInvitations());
    const quests = await answered(apiClient.listQuests());

    expect(invitation?.quest).toMatchObject({ tags: [], faces: [{ name: '윤태오', photo: null }] });
    expect(quests.find(({ id }) => id === 'q-ai')).toMatchObject({
      photo: null,
      tags: ['AI커리어', '취업'],
      faces: [{ name: '김민준' }, { name: '안진영' }, expect.objectContaining({ photo: null })],
    });
    expect(quests.find(({ classQuest }) => classQuest)).toMatchObject({ photo: null, tags: [] });
  });
});
