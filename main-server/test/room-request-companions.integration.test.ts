/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { befriend, type TestUser } from './friends.js';
import { lunchQuest, roomRequestSchema, RoomStage } from './room-requests.js';

// The booker asking one more Friend into a gathering request: the Friend is asked and invited into the booking party,
// which grows when it must, and what the route refuses.

// Each test signs in up to seven Users and befriends them over HTTP before it starts, which takes up to 4 s on a
// loaded runner: close to Vitest's 5 s.
vi.setConfig({ testTimeout: 15_000 });

const stage = new RoomStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

let count = 0;

interface Gathering {
  // The booker is 0, the Friends 1 and on.
  who: (index: number) => TestUser;
  id: string;
  questId: string;
}

// The booker and `size` Friends, of whom the first three are asked, by a booking party unless `questId` is set.
async function gathering(size = 4, { lunch = false } = {}): Promise<Gathering> {
  count += 1;
  const names = ['부', 'a', 'b', 'c', 'd', 'e', 'f'].slice(0, size + 1).map((name) => `더${count}${name}`);
  const people = await stage.party(names);
  const who = (index: number): TestUser => {
    const user = people[index];
    if (user === undefined) {
      throw new Error(`No person ${index}`);
    }
    return user;
  };
  const asked = [1, 2, 3].map((index) => who(index));
  if (lunch) {
    const questId = await lunchQuest(stage.prisma, [who(0).id, ...asked.map(({ id }) => id)]);
    return { who, id: (await stage.asking(who(0), questId)).id, questId };
  }
  const { id, questId } = await stage.made(who(0), asked);
  return { who, id, questId };
}

describe('Asking one more Friend', () => {
  it('asks the Friend, invites them into the booking party and raises its capacity to the people', async () => {
    const { who, id, questId } = await gathering();
    const response = await stage.askOneMore(who(0), id, who(4).id).expect(201);
    const answer = roomRequestSchema.parse(response.body);

    expect(answer).toMatchObject({ id, status: 'gathering', moreNeeded: 0 });
    expect(answer.companions.find(({ userId }) => userId === who(4).id)).toMatchObject({ state: 'asked' });
    const quest = await stage.prisma.quest.findUniqueOrThrow({
      where: { id: questId },
      include: { invitations: true },
    });

    expect(quest.capacity).toBe(5);
    expect(quest.invitations.map(({ userId }) => userId)).toContain(who(4).id);

    await stage.consent(who(4), id).expect(200);
  });

  it('asks again a Friend who declined before', async () => {
    const { who, id } = await gathering(3);
    await stage.decline(who(2), id).expect(204);
    await stage.askOneMore(who(0), id, who(2).id).expect(201);

    expect(await stage.states(who(0), id)).toMatchObject({ [`더${count}b`]: 'asked' });

    await stage.consent(who(2), id).expect(200);
  });
});

describe('What asking one more Friend refuses', () => {
  it('a User who is not the booker’s Friend, and a companion already asked', async () => {
    const { who, id } = await gathering(3);
    const stranger = await stage.user('더모름');

    expect((await stage.askOneMore(who(0), id, stranger.id).expect(400)).body).toMatchObject({
      code: 'ROOM_REQUEST_REFUSED',
      message: '친구가 아닌 사람이 있어요',
    });
    expect((await stage.askOneMore(who(0), id, who(1).id).expect(400)).body).toMatchObject({
      code: 'ROOM_REQUEST_REFUSED',
    });
  });

  it('anyone but the booker', async () => {
    const { who, id } = await gathering();
    await befriend(stage.app, who(1), who(4));

    await stage.askOneMore(who(1), id, who(4).id).expect(403);
  });

  it('a request that is ready or booked', async () => {
    const { who, id } = await gathering();
    await stage.allConsent(id, [who(1), who(2), who(3)]);

    expect((await stage.askOneMore(who(0), id, who(4).id).expect(409)).body).toMatchObject({ status: 'ready' });

    await stage.result(who(0), id, { ok: true }).expect(204);

    expect((await stage.askOneMore(who(0), id, who(4).id).expect(409)).body).toMatchObject({ status: 'booked' });
  });

  it('a seventh person for the six-person room', async () => {
    const { who, id } = await gathering(6);
    await stage.askOneMore(who(0), id, who(4).id).expect(201);
    await stage.askOneMore(who(0), id, who(5).id).expect(201);
    const refused = await stage.askOneMore(who(0), id, who(6).id).expect(400);

    expect(refused.body).toMatchObject({ message: expect.stringContaining('최대 6명') as unknown });
  });

  it('a request that asks an existing Quest’s Holders, who are asked by joining it', async () => {
    const { who, id } = await gathering(4, { lunch: true });

    await stage.askOneMore(who(0), id, who(4).id).expect(409);
  });
});
