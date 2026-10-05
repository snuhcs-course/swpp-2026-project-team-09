import { randomUUID } from 'node:crypto';
import { type Candidate, type Grouping } from '../src/matching/grouping.js';
import { MainServerStub, type Reply } from './main-server.js';
import { useRounds } from './rounds.js';

const rounds = useRounds();

describe('The start of a round', () => {
  it('asks the main server which requests stand, with its token, expires the others and then asks for the eligible Quests', async () => {
    const mainServer = new MainServerStub();
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    const [stands, standsNot] = [await rounds.waiting(globalEventId, 3), await rounds.waiting(globalEventId, 3)];
    mainServer.standing = (requests): Reply => ({
      status: 200,
      body: { standing: requests.filter(({ userId }) => userId === stands.userId) },
    });

    await rounds.run(app);

    expect(mainServer.calls).toEqual([
      {
        path: '/matching-requests/standing',
        body: { requests: [stands, standsNot].map(({ userId }) => ({ userId, globalEventId })) },
        authorization: `Bearer ${rounds.settings.MATCH_SERVER_TOKEN}`,
      },
      {
        path: '/matching-requests/eligible-quests',
        body: { pools: [{ globalEventId, size: 3 }] },
        authorization: `Bearer ${rounds.settings.MATCH_SERVER_TOKEN}`,
      },
    ]);
    expect(await rounds.stateOf(app, stands)).toEqual({ state: 'waiting', questId: null });
    expect(await rounds.stateOf(app, standsNot)).toEqual({ state: 'expired', questId: null });
  });

  it('groups nothing and expires nothing when the main server does not answer', async () => {
    const mainServer = new MainServerStub();
    mainServer.standing = (): Reply => null;
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    const requests = [await rounds.waiting(globalEventId, 2), await rounds.waiting(globalEventId, 2)];

    await rounds.run(app);

    expect(await rounds.matchesOf(globalEventId)).toEqual([]);
    expect(await Promise.all(requests.map((request) => rounds.stateOf(app, request)))).toEqual([
      { state: 'waiting', questId: null },
      { state: 'waiting', questId: null },
    ]);
  });
});

describe('The groups of a round', () => {
  it('are formed for each Global Event and size, and the Quest of each match is asked for', async () => {
    const mainServer = new MainServerStub();
    const app = await rounds.start(mainServer);
    const [first, second] = [randomUUID(), randomUUID()];
    const pairs = [
      await rounds.waiting(first, 2, ['jazz']),
      await rounds.waiting(first, 2),
      await rounds.waiting(first, 2, ['jazz']),
    ];
    const triple = [await rounds.waiting(first, 3), await rounds.waiting(first, 3)];
    const other = [await rounds.waiting(second, 2), await rounds.waiting(second, 2)];

    await rounds.run(app);

    const matches = [...(await rounds.matchesOf(first)), ...(await rounds.matchesOf(second))];
    expect(matches.map(({ state, userIds }) => ({ state, userIds }))).toEqual([
      { state: 'quest_created', userIds: [pairs[0].userId, pairs[2].userId] },
      { state: 'quest_created', userIds: other.map(({ userId }) => userId) },
    ]);
    expect(mainServer.questCalls().map(({ path, body }) => ({ path, body }))).toEqual(
      matches.map(({ id, userIds }, index) => ({
        path: `/matches/${id}/quest`,
        body: { globalEventId: [first, second][index], userIds },
      })),
    );
    const states = await Promise.all([...pairs, ...triple].map((request) => rounds.stateOf(app, request)));
    const questId = mainServer.questIdOf(matches[0].id);
    expect(states).toEqual([
      { state: 'matched', questId },
      { state: 'waiting', questId: null },
      { state: 'matched', questId },
      { state: 'waiting', questId: null },
      { state: 'waiting', questId: null },
    ]);
  });
});

describe('The grouping module in a round', () => {
  it('is given each pool of at least one group, and the groups it returns are formed', async () => {
    const pools: { ids: string[]; size: number }[] = [];
    // Groups the last requests first, which the rule never does.
    const grouping: Grouping = {
      group: (requests: readonly Candidate[], size: number): Promise<Candidate[][]> => {
        pools.push({ ids: requests.map(({ id }) => id), size });
        return Promise.resolve([requests.slice(-size)]);
      },
    };
    const app = await rounds.start(new MainServerStub(), { grouping });
    const globalEventId = randomUUID();
    const alone = await rounds.waiting(globalEventId, 2);
    const pool = [];
    for (let index = 0; index < 4; index += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one after another, so that they arrive in this order
      pool.push(await rounds.waiting(globalEventId, 3));
    }

    await rounds.run(app);

    expect(pools).toEqual([{ ids: pool.map(({ id }) => id), size: 3 }]);
    expect((await rounds.matchesOf(globalEventId)).map(({ userIds }) => userIds)).toEqual([
      pool.slice(1).map(({ userId }) => userId),
    ]);
    expect(await rounds.stateOf(app, alone)).toEqual({ state: 'waiting', questId: null });
    expect(await rounds.stateOf(app, pool[0])).toEqual({ state: 'waiting', questId: null });
  });
});

describe('The rounds of several match servers', () => {
  it('run one at a time: a round that starts while another runs is skipped', async () => {
    let answerFirst: (() => void) | undefined;
    const first = new MainServerStub();
    // Answers once the test says so, which keeps the first round running until then.
    first.standing = (requests): Promise<Reply> =>
      new Promise((resolve) => {
        answerFirst = (): void => {
          resolve({ status: 200, body: { standing: requests } });
        };
      });
    const second = new MainServerStub();
    const [firstApp, secondApp] = [await rounds.start(first), await rounds.start(second)];
    const globalEventId = randomUUID();
    await rounds.waiting(globalEventId, 2);
    await rounds.waiting(globalEventId, 2);

    const firstRound = rounds.run(firstApp);
    await vi.waitFor(() => {
      expect(first.calls).toHaveLength(1);
    });
    await rounds.run(secondApp);
    answerFirst?.();
    await firstRound;

    expect(second.calls).toEqual([]);
    expect(await rounds.matchesOf(globalEventId)).toHaveLength(1);
  });

  it('come at the interval the settings give', async () => {
    const mainServer = new MainServerStub();
    await rounds.start(mainServer, { intervalSeconds: 1 });
    await rounds.waiting(randomUUID(), 2);

    await vi.waitFor(
      () => {
        expect(mainServer.calls.map(({ path }) => path)).toContain('/matching-requests/standing');
      },
      { timeout: 3000 },
    );
  });
});
