/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { endFriendship, TestUser } from './friends.js';
import { answerMeetup, friends, lunch, meetupBetween } from './meetups.js';
import { dropQuest, getQuest, getQuests, markDone, subQuestIn } from './quests.js';
import { SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

function setClock(at: Date): void {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(at);
}

// The names of the signals that went to the User, in order.
function signalsTo(user: TestUser): string[] {
  return watcher.for(user).map(({ name }) => name);
}

const questsSchema = z.array(z.object({ id: z.string(), subQuests: z.array(z.object({ id: z.string() })) }));

// Two Friends who hold the Quest of a Meetup the first proposed and the second accepted.
async function sharedQuest(): Promise<{
  proposer: TestUser;
  receiver: TestUser;
  questId: string;
  subQuestId: string;
  endsAt: string;
}> {
  const [proposer, receiver] = await friends(app);
  const content = lunch();
  await answerMeetup(app, receiver, await meetupBetween(app, proposer, receiver, content), 'accept');
  const [quest] = questsSchema.parse((await getQuests(app, receiver)).body);
  const [subQuest] = quest?.subQuests ?? [];
  if (quest === undefined || subQuest === undefined) {
    throw new Error('Accepting the Meetup gave no Quest');
  }
  return { proposer, receiver, questId: quest.id, subQuestId: subQuest.id, endsAt: content.endsAt };
}

describe('Progress on the Shared Quest of an accepted Meetup', () => {
  it('keeps a mark of done to the Holder who made it', async () => {
    const { proposer, receiver, questId, subQuestId } = await sharedQuest();

    await markDone(app, receiver, { questId, subQuestId });

    expect((await getQuest(app, receiver, questId)).body).toMatchObject({ subQuests: [{ done: true, ended: false }] });
    expect((await getQuest(app, proposer, questId)).body).toMatchObject({
      subQuests: [{ done: false, ended: false }],
    });
    expect((await getQuests(app, receiver)).body).toMatchObject([{ id: questId }]);
    expect((await getQuests(app, proposer)).body).toMatchObject([{ id: questId }]);
  });

  it('ends for both Holders once the end time has passed', async () => {
    const { proposer, receiver, questId, endsAt } = await sharedQuest();

    setClock(new Date(new Date(endsAt).getTime() - 1));
    const before = await getQuest(app, proposer, questId);
    setClock(new Date(endsAt));

    expect(before.body).toMatchObject({ subQuests: [{ ended: false }] });
    expect((await getQuest(app, proposer, questId)).body).toMatchObject({ subQuests: [{ ended: true }] });
    expect((await getQuest(app, receiver, questId)).body).toMatchObject({ subQuests: [{ ended: true }] });
  });
});

describe('Changes to the Shared Quest of an accepted Meetup', () => {
  it('shows a Sub Quest that either Holder adds to both', async () => {
    const { proposer, receiver, questId } = await sharedQuest();

    const added = await subQuestIn(app, proposer, questId, { title: '카페' });

    const reads = await Promise.all([getQuest(app, proposer, questId), getQuest(app, receiver, questId)]);
    for (const { body } of reads) {
      expect(body).toMatchObject({ subQuests: [{ title: '점심' }, { id: added, title: '카페' }] });
    }
    await vi.waitFor(() => {
      expect(signalsTo(receiver).filter((name) => name === 'quests-changed')).toHaveLength(2);
    });
  });

  it('stays with the other Holder when one drops it, who is told', async () => {
    const { proposer, receiver, questId } = await sharedQuest();

    await dropQuest(app, proposer, questId);

    expect((await getQuests(app, proposer)).body).toEqual([]);
    expect((await getQuest(app, receiver, questId)).body).toMatchObject({ holders: [{ id: receiver.id }] });
    // One for accepting and one for the drop.
    await vi.waitFor(() => {
      expect(signalsTo(receiver).filter((name) => name === 'quests-changed')).toHaveLength(2);
    });
  });
});

// The signals other than friends-changed that went to the User, in order.
function meetupSignalsTo(user: TestUser): string[] {
  return signalsTo(user).filter((name) => name !== 'friends-changed');
}

describe('meetups-changed on an answer', () => {
  it.each([
    ['declined', 'decline'],
    ['withdrawn', 'withdraw'],
  ] as const)('goes to both Friends when a Meetup is proposed and when it is %s', async (_state, answer) => {
    const [proposer, receiver] = await friends(app);
    const meetupId = await meetupBetween(app, proposer, receiver);

    await answerMeetup(app, answer === 'withdraw' ? proposer : receiver, meetupId, answer);

    await vi.waitFor(() => {
      expect(meetupSignalsTo(proposer)).toEqual(['meetups-changed', 'meetups-changed']);
      expect(meetupSignalsTo(receiver)).toEqual(['meetups-changed', 'meetups-changed']);
    });
  });

  it('goes to both Friends with quests-changed when a Meetup is accepted', async () => {
    const { proposer, receiver } = await sharedQuest();

    await vi.waitFor(() => {
      expect(meetupSignalsTo(proposer)).toEqual(['meetups-changed', 'meetups-changed', 'quests-changed']);
      expect(meetupSignalsTo(receiver)).toEqual(['meetups-changed', 'meetups-changed', 'quests-changed']);
    });
  });
});

describe('meetups-changed when a friendship ends', () => {
  it('goes to both when a Meetup is withdrawn by it, and not when none was proposed', async () => {
    const [user, friend] = await friends(app);
    const [other, otherFriend] = await friends(app);
    await meetupBetween(app, user, friend);

    await endFriendship(app, user, friend.id);
    await endFriendship(app, other, otherFriend.id);

    await vi.waitFor(() => {
      expect(meetupSignalsTo(user)).toEqual(['meetups-changed', 'meetups-changed']);
      expect(meetupSignalsTo(friend)).toEqual(['meetups-changed', 'meetups-changed']);
      // Becoming Friends and ending it.
      expect(signalsTo(other)).toHaveLength(3);
    });
    expect(meetupSignalsTo(other)).toEqual([]);
    expect(meetupSignalsTo(otherFriend)).toEqual([]);
  });
});
