/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type TestUser } from './friends.js';
import { BADMINTON, InterestsStage } from './interests.js';
import { patchProfile } from './profile.js';
import { ownQuest } from './quests.js';

// A match of a User's interests, and the Notification of a new one, through the routes, with the step run by the test.
// Other files store job fairs and Quests in the same database, so each test looks only at its own.

const stage = new InterestsStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const matchSchema = z.array(z.object({ id: z.string(), watched: z.boolean() }));
const matchesSchema = z.object({ globalEvents: matchSchema, quests: matchSchema });
const noticeSchema = z.array(z.object({ kind: z.string(), title: z.string(), line: z.string(), url: z.string() }));

type Notice = z.infer<typeof noticeSchema>[number];

async function matchesOf(user: TestUser): Promise<z.infer<typeof matchesSchema>> {
  const response = await stage.get(user, '/interests/matches');
  expect(response.status).toBe(200);
  return matchesSchema.parse(response.body);
}

// The User's Notifications that open this card.
async function noticesOf(user: TestUser, card: string): Promise<Notice[]> {
  const notices = noticeSchema.parse((await stage.get(user, '/notifications')).body);
  return notices.filter(({ url }) => url === `/main?card=${card}`);
}

async function watching(words: string): Promise<TestUser> {
  const user = await stage.user();
  expect((await stage.watch(user, words)).status).toBe(201);
  return user;
}

// The Leader's Open Quest 배드민턴 칠 사람 at 18:30 on 2087-03-06 in Korea, once the step has read it.
async function taggedQuest(leader: TestUser): Promise<string> {
  const questId = await ownQuest(stage.app, leader, {
    title: BADMINTON,
    joinPolicy: 'open',
    subQuest: { title: '배드민턴', startsAt: '2087-03-06T18:30:00+09:00' },
  });
  await stage.stepUntil(
    async () => (await stage.prisma.quest.findUniqueOrThrow({ where: { id: questId } })).topicsTries > 0,
  );
  return questId;
}

describe('A hashtag', () => {
  it('matches the job fair, not as a watched interest, and tells nothing', async () => {
    const user = await stage.user();
    expect((await patchProfile(stage.app, user.accessToken, { hashtags: ['#채용'] })).status).toBe(200);
    const event = await stage.tagged(await stage.jobFair());

    expect((await matchesOf(user)).globalEvents).toContainEqual({ id: event.id, watched: false });
    expect(await noticesOf(user, `event:${event.id}`)).toEqual([]);
  });
});

describe('A watched interest', () => {
  it('kept before the job fair is tagged is told of it once, and matches it', async () => {
    const user = await watching('채용 관련 행사');
    const event = await stage.tagged(await stage.jobFair());

    expect(await noticesOf(user, `event:${event.id}`)).toEqual([
      {
        kind: 'interest-new',
        title: '2026 하반기 채용박람회가 떴어요',
        line: '14:00 학생회관',
        url: `/main?card=event:${event.id}`,
      },
    ]);
    expect((await matchesOf(user)).globalEvents).toContainEqual({ id: event.id, watched: true });
  });

  it('kept after the job fair is tagged matches it and is told nothing', async () => {
    const event = await stage.tagged(await stage.jobFair());
    const user = await watching('채용 관련 행사');

    expect((await matchesOf(user)).globalEvents).toContainEqual({ id: event.id, watched: true });
    expect(await noticesOf(user, `event:${event.id}`)).toEqual([]);
  });
});

describe('A watched interest and a recruiting Quest', () => {
  it('is told of a recruiting Quest, which opens its party card', async () => {
    const user = await watching('배드민턴');
    const questId = await taggedQuest(await stage.user());

    expect(await noticesOf(user, `party:${questId}`)).toEqual([
      {
        kind: 'interest-new',
        title: '배드민턴 칠 사람 모집이 떴어요',
        line: '18:30',
        url: `/main?card=party:${questId}`,
      },
    ]);
    expect((await matchesOf(user)).quests).toContainEqual({ id: questId, watched: true });
  });

  it('of a Leader is not told of their own Quest', async () => {
    const leader = await watching('배드민턴');
    const questId = await taggedQuest(leader);

    expect(await noticesOf(leader, `party:${questId}`)).toEqual([]);
  });

  it('does not match an event of another topic', async () => {
    const user = await watching('배드민턴');
    const event = await stage.tagged(await stage.jobFair());

    expect((await matchesOf(user)).globalEvents.map(({ id }) => id)).not.toContain(event.id);
  });
});
