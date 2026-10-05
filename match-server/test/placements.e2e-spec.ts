import { randomUUID } from 'node:crypto';
import { type EligibleQuest, MainServerStub, refusal, type Reply } from './main-server.js';
import { type StoredRequest, useRounds } from './rounds.js';

const rounds = useRounds();

let made = 0;

// An Open Quest of the Global Event with a capacity of `size`, made after every Quest made before it.
function openQuest(
  globalEventId: string,
  size: number,
  { freePlaces = 1, holderIds = [randomUUID()] }: { freePlaces?: number; holderIds?: string[] } = {},
): EligibleQuest {
  made += 1;
  const createdAt = new Date(Date.UTC(2026, 9, 1, 8, 0, made)).toISOString();
  return { id: randomUUID(), globalEventId, capacity: size, freePlaces, holderIds, createdAt };
}

function answering(quests: EligibleQuest[]): () => Reply {
  return () => ({ status: 200, body: { quests } });
}

function placementOf(request: StoredRequest, quest: EligibleQuest): object {
  return { questId: quest.id, userId: request.userId, size: quest.capacity };
}

const WAITING = { state: 'waiting', questId: null };

describe('The placements of a round', () => {
  it('ask for the eligible Quests of the standing requests and fill the earliest Quest with the earliest request', async () => {
    const mainServer = new MainServerStub();
    const app = await rounds.start(mainServer);
    const [globalEventId, other] = [randomUUID(), randomUUID()];
    const earliest = openQuest(globalEventId, 3);
    const later = openQuest(globalEventId, 3, { freePlaces: 2 });
    // Answered out of order: the round orders them by the time they were made.
    mainServer.eligible = answering([later, earliest]);
    const requests = [];
    for (let index = 0; index < 4; index += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one after another, so that they arrive in this order
      requests.push(await rounds.waiting(globalEventId, 3));
    }
    const pair = await rounds.waiting(other, 2);

    await rounds.run(app);

    expect(mainServer.calls.map(({ path }) => path).slice(0, 2)).toEqual([
      '/matching-requests/standing',
      '/matching-requests/eligible-quests',
    ]);
    expect(mainServer.calls[1]?.body).toEqual({
      pools: [
        { globalEventId, size: 3 },
        { globalEventId: other, size: 2 },
      ],
    });
    expect(mainServer.placements()).toEqual([
      placementOf(requests[0], earliest),
      placementOf(requests[1], later),
      placementOf(requests[2], later),
    ]);
    expect(await Promise.all([...requests, pair].map((request) => rounds.stateOf(app, request)))).toEqual([
      { state: 'matched', questId: earliest.id },
      { state: 'matched', questId: later.id },
      { state: 'matched', questId: later.id },
      WAITING,
      WAITING,
    ]);
  });
});

describe('The groups of a round with placements', () => {
  it('are formed after the placements, of the requests that were not placed', async () => {
    const mainServer = new MainServerStub();
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    const quest = openQuest(globalEventId, 2);
    mainServer.eligible = answering([quest]);
    const requests = [
      await rounds.waiting(globalEventId, 2),
      await rounds.waiting(globalEventId, 2),
      await rounds.waiting(globalEventId, 2),
    ];

    await rounds.run(app);

    expect(mainServer.placements()).toEqual([placementOf(requests[0], quest)]);
    const [match] = await rounds.matchesOf(globalEventId);
    expect(match?.userIds).toEqual([requests[1].userId, requests[2].userId]);
    expect(await rounds.stateOf(app, requests[0])).toEqual({ state: 'matched', questId: quest.id });
    expect(await rounds.stateOf(app, requests[2])).toEqual({
      state: 'matched',
      questId: mainServer.questIdOf(match?.id ?? ''),
    });
  });
});

describe('A request whose User holds an eligible Quest', () => {
  it('is never placed into it, and is placed into the next Quest', async () => {
    const mainServer = new MainServerStub();
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    const [holding, other] = [await rounds.waiting(globalEventId, 3), await rounds.waiting(globalEventId, 3)];
    const own = openQuest(globalEventId, 3, { freePlaces: 2, holderIds: [holding.userId] });
    const next = openQuest(globalEventId, 3);
    mainServer.eligible = answering([own, next]);

    await rounds.run(app);

    expect(mainServer.placements()).toEqual([placementOf(other, own), placementOf(holding, next)]);
    expect(await rounds.stateOf(app, holding)).toEqual({ state: 'matched', questId: next.id });
  });
});

describe('A round in which no request stands', () => {
  it('asks for no eligible Quest', async () => {
    const mainServer = new MainServerStub();
    mainServer.standing = (): Reply => ({ status: 200, body: { standing: [] } });
    const app = await rounds.start(mainServer);
    await rounds.waiting(randomUUID(), 2);

    await rounds.run(app);

    expect(mainServer.calls.map(({ path }) => path)).toEqual(['/matching-requests/standing']);
  });
});

describe('A placement the main server refuses', () => {
  it.each([
    [409, 'QUEST_FULL'],
    [409, 'QUEST_NOT_OPEN'],
    [409, 'QUEST_CAPACITY_DIFFERS'],
    [409, 'QUEST_ENDED'],
    [409, 'SHARED_QUEST_HELD'],
    [404, 'QUEST_NOT_FOUND'],
  ] as const)('on %s %s leaves the request waiting for the next round', async (status, code) => {
    const mainServer = new MainServerStub();
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    mainServer.eligible = answering([openQuest(globalEventId, 2)]);
    mainServer.placement = (): Reply => refusal(status, code);
    const requests = [await rounds.waiting(globalEventId, 2), await rounds.waiting(globalEventId, 2)];

    await rounds.run(app);

    expect(await Promise.all(requests.map((request) => rounds.stateOf(app, request)))).toEqual([WAITING, WAITING]);
    expect(await rounds.matchesOf(globalEventId)).toEqual([]);

    mainServer.eligible = answering([]);
    await rounds.run(app);

    expect((await rounds.matchesOf(globalEventId)).map(({ userIds }) => userIds)).toEqual([
      requests.map(({ userId }) => userId),
    ]);
  });
});

describe('A main server that does not answer', () => {
  it('leaves a request it did not place waiting, and the round places the others', async () => {
    const mainServer = new MainServerStub();
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    const quests = [openQuest(globalEventId, 2), openQuest(globalEventId, 2)];
    mainServer.eligible = answering(quests);
    const [unanswered, placed] = [await rounds.waiting(globalEventId, 2), await rounds.waiting(globalEventId, 2)];
    const enter = mainServer.placement;
    mainServer.placement = (placement): Reply => (placement.userId === unanswered.userId ? null : enter(placement));

    await rounds.run(app);

    expect(mainServer.placements()).toHaveLength(2);
    expect(await rounds.stateOf(app, unanswered)).toEqual(WAITING);
    expect(await rounds.stateOf(app, placed)).toEqual({ state: 'matched', questId: quests[1]?.id });
  });

  it('about the eligible Quests leaves every request to the groups', async () => {
    const mainServer = new MainServerStub();
    mainServer.eligible = (): Reply => null;
    const app = await rounds.start(mainServer);
    const globalEventId = randomUUID();
    const requests = [await rounds.waiting(globalEventId, 2), await rounds.waiting(globalEventId, 2)];

    await rounds.run(app);

    expect(mainServer.placements()).toEqual([]);
    expect((await rounds.matchesOf(globalEventId)).map(({ userIds }) => userIds)).toEqual([
      requests.map(({ userId }) => userId),
    ]);
  });
});

describe('Two match servers running a round at the same moment', () => {
  it('place each request once', async () => {
    const globalEventId = randomUUID();
    const quest = openQuest(globalEventId, 2, { freePlaces: 1 });
    let answerFirst: (() => void) | undefined;
    const first = new MainServerStub();
    first.eligible = answering([quest]);
    // Answers once the test says so, which keeps the first round running until then.
    first.standing = (requests): Promise<Reply> =>
      new Promise((resolve) => {
        answerFirst = (): void => {
          resolve({ status: 200, body: { standing: requests } });
        };
      });
    const second = new MainServerStub();
    second.eligible = answering([quest]);
    const [firstApp, secondApp] = [await rounds.start(first), await rounds.start(second)];
    const request = await rounds.waiting(globalEventId, 2);

    const firstRound = rounds.run(firstApp);
    await vi.waitFor(() => {
      expect(first.calls).toHaveLength(1);
    });
    const secondRound = rounds.run(secondApp);
    answerFirst?.();
    await Promise.all([firstRound, secondRound]);

    expect([...first.placements(), ...second.placements()]).toEqual([placementOf(request, quest)]);
    expect(await rounds.stateOf(firstApp, request)).toEqual({ state: 'matched', questId: quest.id });
  });
});
