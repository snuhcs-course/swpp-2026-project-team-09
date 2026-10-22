/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { REDIS } from '../src/common/redis.module.js';
import { befriend, signInUser } from './friends.js';
import {
  getPositions,
  OFF_CAMPUS,
  ON_CAMPUS,
  setMasterSwitch,
  sharingFriends,
  uploadPosition,
} from './location-sharing.js';
import { ANY_STRING, refused } from './signals.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

// 제1공학관 (301동), on campus.
const OTHER_PLACE = { latitude: 37.4502, longitude: 126.9526 };

function secondsFromNow(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

describe('An upload refused', () => {
  it('while the Master Switch is off', async () => {
    const user = await signInUser(app);

    const response = await uploadPosition(app, user);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'MASTER_SWITCH_OFF'));
  });

  // The times are taken when the upload is sent.
  it.each([
    ['measured more than 60 seconds ago', (): object => ({ measuredAt: secondsFromNow(-61) }), 'POSITION_TOO_OLD'],
    [
      "measured more than 10 seconds ahead of the server's clock",
      (): object => ({ measuredAt: secondsFromNow(11) }),
      'POSITION_IN_THE_FUTURE',
    ],
    ['with an accuracy radius over 100 metres', (): object => ({ accuracy: 100.5 }), 'POSITION_TOO_INACCURATE'],
  ])('when %s', async (_case, changes, code) => {
    const [user] = await sharingFriends(app);

    const response = await uploadPosition(app, user, changes());

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(refused(400, code));
  });

  it.each([
    ['without a measured time', { measuredAt: undefined }],
    ['with a latitude that is not one', { latitude: 91 }],
    ['with a negative accuracy', { accuracy: -1 }],
  ])('%s', async (_case, changes) => {
    const [user] = await sharingFriends(app);

    expect((await uploadPosition(app, user, changes)).status).toBe(400);
  });
});

describe('An upload taken', () => {
  it('within the limits is kept and answers that the User is on campus', async () => {
    const [user, friend] = await sharingFriends(app);
    const measuredAt = secondsFromNow(-55);

    const response = await uploadPosition(app, user, { accuracy: 100, measuredAt });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ offCampus: false });
    expect((await getPositions(app, friend)).body).toEqual([{ userId: user.id, ...ON_CAMPUS, measuredAt }]);
  });

  it("up to 10 seconds ahead of the server's clock is kept", async () => {
    const [user] = await sharingFriends(app);

    expect((await uploadPosition(app, user, { measuredAt: secondsFromNow(5) })).body).toEqual({ offCampus: false });
  });

  it('replaces the position before', async () => {
    const [user, friend] = await sharingFriends(app);
    await uploadPosition(app, user);

    await uploadPosition(app, user, OTHER_PLACE);

    expect((await getPositions(app, friend)).body).toEqual([
      { userId: user.id, ...OTHER_PLACE, measuredAt: ANY_STRING },
    ]);
  });

  it('outside the Campus Boundary is not kept, clears the position stored and says that the User is off campus', async () => {
    const [user, friend] = await sharingFriends(app);
    await uploadPosition(app, user);

    const response = await uploadPosition(app, user, OFF_CAMPUS);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ offCampus: true });
    expect((await getPositions(app, friend)).body).toEqual([]);
    expect(await app.get<Redis>(REDIS).exists(`position:${user.id}`)).toBe(0);
  });
});

describe('The fetch of the positions', () => {
  it('answers each position the User may see now with the time it was measured, and no other', async () => {
    const [viewer, friend] = await sharingFriends(app);
    const [otherFriend, stranger] = await sharingFriends(app);
    await befriend(app, viewer, otherFriend);
    const measuredAt = secondsFromNow(-20);
    await Promise.all([
      uploadPosition(app, friend, { measuredAt }),
      uploadPosition(app, otherFriend, { ...OTHER_PLACE, measuredAt }),
      uploadPosition(app, stranger),
      uploadPosition(app, viewer),
    ]);

    const response = await getPositions(app, viewer);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(
      expect.arrayContaining([
        { userId: friend.id, ...ON_CAMPUS, measuredAt },
        { userId: otherFriend.id, ...OTHER_PLACE, measuredAt },
      ]),
    );
  });
});

describe('The position stored', () => {
  it('expires 10 minutes after it was stored', async () => {
    const [user] = await sharingFriends(app);

    await uploadPosition(app, user, { measuredAt: secondsFromNow(-30) });

    const lifetime = await app.get<Redis>(REDIS).pttl(`position:${user.id}`);
    expect(lifetime).toBeGreaterThan(595_000);
    expect(lifetime).toBeLessThanOrEqual(600_000);
  });

  it('is cleared when the User turns the Master Switch off', async () => {
    const [user, friend] = await sharingFriends(app);
    await uploadPosition(app, user);

    await setMasterSwitch(app, user, false);
    await setMasterSwitch(app, user, true);

    expect((await getPositions(app, friend)).body).toEqual([]);
  });
});
