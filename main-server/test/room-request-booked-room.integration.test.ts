/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { z } from 'zod';
import { type TestUser } from './friends.js';
import { getQuest } from './quests.js';
import { RoomStage } from './room-requests.js';

// The room the library booked, shown to the party (P05 ticket 68). The booker's phone alone reads it from the library
// and reports it with the booking; the server keeps it on the request and gives it to the requester and the Holders of
// the request's Quest, and to nobody else. Decided by the user on 2026-11-27: "그룹스터디룸? 그러면 당연히
// 보여줘야지".

const stage = new RoomStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

const questSchema = z.object({ bookedRoom: z.string().nullable() });

async function bookedRoomOn(user: TestUser, questId: string): Promise<string | null> {
  const response = await getQuest(stage.app, user, questId).expect(200);
  return questSchema.parse(response.body).bookedRoom;
}

// A booker and four Friends, of whom 하늘 declines: the four left are the 6인실's minimum.
async function partyWithOneOut(
  prefix: string,
): Promise<{ id: string; questId: string; party: TestUser[]; out: TestUser }> {
  const [booker, minsu, jieun, seojun, haneul] = await stage.party([
    `${prefix}부커`,
    `${prefix}민수`,
    `${prefix}지은`,
    `${prefix}서준`,
    `${prefix}하늘`,
  ] as const);
  const { id, questId } = await stage.made(booker, [minsu, jieun, seojun, haneul]);
  await stage.decline(haneul, id).expect(204);
  await stage.allConsent(id, [minsu, jieun, seojun]);
  return { id, questId, party: [booker, minsu, jieun, seojun], out: haneul };
}

describe('The room the library booked', () => {
  it('is kept with the booking and shown to the requester and every Holder, and to no one out of the party', async () => {
    const { id, questId, party, out } = await partyWithOneOut('방번');
    const [booker] = party;
    if (booker === undefined) {
      throw new Error('A party has its booker');
    }

    await stage.result(booker, id, { ok: true, room: ' G412 ' }).expect(204);

    expect(await stage.status(booker, id)).toMatchObject({ status: 'booked', bookedRoom: 'G412' });
    expect((await stage.notices(party[1] ?? booker)).at(-1)).toMatch(/ 예약을 마쳤어요 · G412$/u);
    for (const holder of party) {
      // oxlint-disable-next-line no-await-in-loop -- one Holder at a time
      expect(await bookedRoomOn(holder, questId)).toBe('G412');
    }
    await getQuest(stage.app, out, questId).expect(404);
    await stage.read(out, id).expect(404);
  });

  it('is null for a booking reported without it, and a repeat that gives it keeps it', async () => {
    const { id, questId, party } = await partyWithOneOut('방없');
    const [booker, minsu] = party;
    if (booker === undefined || minsu === undefined) {
      throw new Error('A party has its booker and a companion');
    }

    await stage.result(booker, id, { ok: true }).expect(204);

    expect((await stage.status(booker, id)).bookedRoom).toBeNull();
    expect((await stage.notices(minsu)).at(-1)).toMatch(/ 예약을 마쳤어요$/u);
    expect(await bookedRoomOn(minsu, questId)).toBeNull();

    await stage.result(booker, id, { ok: true, room: 'G405' }).expect(204);

    expect(await bookedRoomOn(minsu, questId)).toBe('G405');
  });
});

describe('The room the library booked, in the notice and in the report', () => {
  it("is cut in the companions' notice past 12 characters, and kept whole", async () => {
    const { id, questId, party } = await partyWithOneOut('방길');
    const [booker, minsu] = party;
    if (booker === undefined || minsu === undefined) {
      throw new Error('A party has its booker and a companion');
    }
    const long = '그룹스터디룸 G412 (4층 창가)';

    await stage.result(booker, id, { ok: true, room: long }).expect(204);

    expect((await stage.notices(minsu)).at(-1)).toMatch(/ 예약을 마쳤어요 · 그룹스터디룸 G412…$/u);
    expect(await bookedRoomOn(minsu, questId)).toBe(long);
  });

  it('comes with ok only, and is a short text', async () => {
    const { id, party } = await partyWithOneOut('방틀');
    const [booker] = party;
    if (booker === undefined) {
      throw new Error('A party has its booker');
    }

    await stage.result(booker, id, { ok: false, room: 'G412' }).expect(400);
    await stage.result(booker, id, { ok: true, room: '' }).expect(400);
    await stage.result(booker, id, { ok: true, room: 'G'.repeat(41) }).expect(400);

    expect((await stage.status(booker, id)).status).toBe('ready');
  });
});
