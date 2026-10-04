import { randomUUID } from 'node:crypto';
import { MainServerStub, refusal, type Reply } from './main-server.js';
import { useRounds } from './rounds.js';

const rounds = useRounds();

describe("A match's Quest that the main server has not answered", () => {
  it('is asked for again in the next round when the main server did not answer', async () => {
    const mainServer = new MainServerStub();
    const answer = mainServer.quest;
    mainServer.quest = (): Reply => null;
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    const requests = [await rounds.waiting(globalEventId, 2), await rounds.waiting(globalEventId, 2)];
    await rounds.run(app);
    expect((await rounds.matchesOf(globalEventId)).map(({ state }) => state)).toEqual(['awaiting_quest']);
    expect(await rounds.stateOf(app, requests[0])).toEqual({ state: 'matched', questId: null });

    mainServer.quest = answer;
    await rounds.run(app);

    const [match] = await rounds.matchesOf(globalEventId);
    expect(match.state).toBe('quest_created');
    const path = `/matches/${match.id}/quest`;
    expect(mainServer.questCalls().map((call) => call.path)).toEqual([path, path]);
    const questId = mainServer.questIdOf(match.id);
    expect(await rounds.stateOf(app, requests[1])).toEqual({ state: 'matched', questId });
  });

  it('is asked for by the match server that starts after a restart between the match and the answer', async () => {
    const down = new MainServerStub();
    down.quest = (): Reply => null;
    const before = await rounds.start(down);
    const globalEventId = randomUUID();
    const requests = [await rounds.waiting(globalEventId, 2), await rounds.waiting(globalEventId, 2)];
    await rounds.run(before);
    await rounds.stop(before);

    const mainServer = new MainServerStub();
    const after = await rounds.start(mainServer);
    await rounds.run(after);

    const [match] = await rounds.matchesOf(globalEventId);
    expect(mainServer.questCalls()).toEqual([
      {
        path: `/matches/${match.id}/quest`,
        body: { globalEventId, userIds: requests.map(({ userId }) => userId) },
        authorization: `Bearer ${rounds.settings.MATCH_SERVER_TOKEN}`,
      },
    ]);
    expect(match.state).toBe('quest_created');
    const questId = mainServer.questIdOf(match.id);
    expect(await rounds.stateOf(after, requests[0])).toEqual({ state: 'matched', questId });
  });
});

describe("A match's Quest without every matched User", () => {
  it('expires the request of the User the main server left out', async () => {
    const mainServer = new MainServerStub();
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    const [kept, other, leftOut] = [
      await rounds.waiting(globalEventId, 3),
      await rounds.waiting(globalEventId, 3),
      await rounds.waiting(globalEventId, 3),
    ];
    mainServer.quest = (matchId): Reply => ({
      status: 201,
      body: { questId: mainServer.questIdOf(matchId), holderIds: [kept.userId, other.userId] },
    });

    await rounds.run(app);

    const [{ id }] = await rounds.matchesOf(globalEventId);
    expect(await rounds.stateOf(app, kept)).toEqual({ state: 'matched', questId: mainServer.questIdOf(id) });
    expect(await rounds.stateOf(app, leftOut)).toEqual({ state: 'expired', questId: null });
  });
});

describe('A match the main server refuses', () => {
  it.each([
    [409, 'GLOBAL_EVENT_STARTED'],
    [404, 'GLOBAL_EVENT_NOT_FOUND'],
    [409, 'MATCH_TOO_SMALL'],
  ] as const)('is closed on %s %s, its requests expire and it is not asked for again', async (status, code) => {
    const mainServer = new MainServerStub();
    mainServer.quest = (): Reply => refusal(status, code);
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    const requests = [await rounds.waiting(globalEventId, 2), await rounds.waiting(globalEventId, 2)];

    await rounds.run(app);
    await rounds.run(app);

    expect((await rounds.matchesOf(globalEventId)).map(({ state }) => state)).toEqual(['closed']);
    expect(mainServer.questCalls()).toHaveLength(1);
    expect(await Promise.all(requests.map((request) => rounds.stateOf(app, request)))).toEqual([
      { state: 'expired', questId: null },
      { state: 'expired', questId: null },
    ]);
  });
});
