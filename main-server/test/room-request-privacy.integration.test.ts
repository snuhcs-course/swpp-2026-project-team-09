/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import request from 'supertest';
import { inject } from 'vitest';
import { captureLogs } from './assistant.js';
import { type TestUser } from './friends.js';
import { removeHolder } from './quest-recruiting.js';
import { companionsSchema, RoomStage } from './room-requests.js';
import { withAccessToken } from './sign-in.js';

// A 학번 and a registered name reach only the requester's phone, in the companions reply, while every companion
// consents: never another User, another reply or a log line.

const stage = new RoomStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

let count = 0;

async function readyRequest(): Promise<{ people: readonly [TestUser, TestUser, TestUser, TestUser]; id: string }> {
  count += 1;
  const people = await stage.party(
    [`비밀${count}부`, `비밀${count}a`, `비밀${count}b`, `비밀${count}c`] as const,
    '20265',
  );
  const [booker, ...friends] = people;
  const { id } = await stage.made(booker, friends);
  await stage.allConsent(id, friends);
  return { people, id };
}

describe('The companions reply', () => {
  it('gives the requester the registered name and 학번 of each consenting Holder while ready', async () => {
    const { people, id } = await readyRequest();
    const [booker, ...friends] = people;
    const response = await stage.companions(booker, id).expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(companionsSchema.parse(response.body).toSorted((a, b) => a.userId.localeCompare(b.userId))).toEqual(
      friends
        .map((friend, index) => ({
          userId: friend.id,
          registeredName: `비밀${count}${'abc'[index]}학적`,
          studentNumber: `20265000${index + 2}`,
        }))
        .toSorted((a, b) => a.userId.localeCompare(b.userId)),
    );
  });

  it('is refused to anyone else, and while the request is not ready', async () => {
    count += 1;
    const people = await stage.party([`거부${count}부`, `거부${count}a`, `거부${count}b`, `거부${count}c`] as const);
    const [booker, minsu, ...rest] = people;
    const { id } = await stage.made(booker, [minsu, ...rest]);

    await stage.companions(booker, id).expect(409);

    await stage.allConsent(id, [minsu, ...rest]);
    await stage.companions(minsu, id).expect(403);
    await stage.companions(await stage.user('남'), id).expect(403);
  });

  it('never holds someone who was removed after consenting: the request is dissolved', async () => {
    const { people, id } = await readyRequest();
    const [booker, , jieun] = people;
    const { questId } = await stage.status(booker, id);
    await removeHolder(stage.app, booker, questId, jieun.id).expect(204);

    await stage.companions(booker, id).expect(409);
  });
});

describe('Everything else', () => {
  it('holds no 학번 and no registered name, in a reply or a log line', async () => {
    const logs = captureLogs();
    const { people, id } = await readyRequest();
    const [booker, minsu] = people;
    const { questId } = await stage.status(booker, id);
    await stage.companions(booker, id).expect(200);
    await stage.result(booker, id, { ok: false, failedUserId: minsu.id }).expect(204);
    await stage.inbox(minsu).expect(200);
    await stage.consent(minsu, id).expect(200);
    await stage.result(booker, id, { ok: true }).expect(204);
    await stage.cancelled(booker, id).expect(204);
    await stage.inbox(minsu).expect(200);
    await stage.read(minsu, id).expect(200);
    for (const user of people) {
      for (const path of ['/quests', '/quest-invitations', '/friends', `/quests/${questId}`]) {
        // oxlint-disable-next-line no-await-in-loop -- one reply at a time
        const response = await withAccessToken(request(stage.app.getHttpServer()).get(path), user.accessToken);
        stage.replies.push(JSON.stringify(response.body));
      }
    }
    const seen = [...stage.replies, logs()].join('\n');

    expect(stage.replies.length).toBeGreaterThan(20);

    for (const [index] of people.entries()) {
      expect(seen).not.toContain(`20265000${index + 1}`);
      expect(seen).not.toContain(`비밀${count}${['부', 'a', 'b', 'c'][index]}학적`);
    }
  });
});
