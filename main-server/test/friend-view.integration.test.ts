/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type FriendView } from '../src/friends/dto/friend-view.dto.js';
import { type FriendViewService } from '../src/friends/friend-view.service.js';
import { befriend, getFriends, signInUser, type TestUser } from './friends.js';
import {
  expectStatus,
  ON_CAMPUS,
  setFriendSharing,
  setMasterSwitch,
  sharingFriends,
  uploadPosition,
} from './location-sharing.js';
import { partyOfHolders, setPartySharing } from './parties.js';
import { ONBOARDED_PROFILE, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// What a viewer sees of each Friend, read through the service of the started server with real switches.

const settings = inject('settings');
let app: INestApplication<Server>;
let view: FriendViewService;

beforeAll(async () => {
  app = await startApp(settings);
  // Imported after startApp, so that it is the class the server registered.
  const { FriendViewService } = await import('../src/friends/friend-view.service.js');
  view = app.get(FriendViewService);
});

afterAll(async () => {
  await app.close();
});

// For the tests that sign in three Users, on a machine that may be busy.
const SLOW = { timeout: 20_000 };

// 중앙도서관 본관, measured now.
const position = (): { latitude: number; longitude: number; measuredAt: string } => ({
  ...ON_CAMPUS,
  measuredAt: new Date().toISOString(),
});

async function libraryPlaceId(user: TestUser): Promise<string> {
  const response = await withAccessToken(request(app.getHttpServer()).get('/places'), user.accessToken);
  const places = z.array(z.object({ id: z.string(), number: z.string().nullable() })).parse(response.body);
  const library = places.find(({ number }) => number === '62');
  if (library === undefined) {
    throw new Error('The seed has no Place numbered 62');
  }
  return library.id;
}

const atTimetable = (friend: TestUser): FriendView => ({
  id: friend.id,
  name: ONBOARDED_PROFILE.name,
  department: ONBOARDED_PROFILE.department,
  level: 'timetable',
  position: null,
  placeId: null,
});

describe('A Friend the viewer may see now', () => {
  it('is exact, with the position uploaded and the id of its Place', async () => {
    const [viewer, friend] = await sharingFriends(app);
    const uploaded = position();
    await expectStatus(uploadPosition(app, friend, uploaded), 200);

    expect(await view.list(viewer.id)).toEqual([
      { ...atTimetable(friend), level: 'exact', position: uploaded, placeId: await libraryPlaceId(viewer) },
    ]);
  });
});

type Change = (viewer: TestUser, friend: TestUser) => Promise<unknown>;

const NOT_SEEN: [string, Change][] = [
  [
    'the Friend has turned their sharing with the viewer off',
    (viewer, friend) => expectStatus(setFriendSharing(app, friend, viewer.id, false), 204),
  ],
  [
    'the viewer has turned their sharing with the Friend off',
    (viewer, friend) => expectStatus(setFriendSharing(app, viewer, friend.id, false), 204),
  ],
  ["the Friend's Master Switch is off", (_viewer, friend) => expectStatus(setMasterSwitch(app, friend, false), 204)],
  ["the viewer's Master Switch is off", (viewer) => expectStatus(setMasterSwitch(app, viewer, false), 204)],
];

describe('A Friend the viewer may not see now', () => {
  it.each(NOT_SEEN)('is at the Timetable, with no position and no Place, when %s', async (_case, change) => {
    const [viewer, friend] = await sharingFriends(app);
    await expectStatus(uploadPosition(app, friend, position()), 200);
    await change(viewer, friend);

    expect(await view.list(viewer.id)).toEqual([atTimetable(friend)]);
  });

  it('is at the Timetable when they share but have no position kept', async () => {
    const [viewer, friend] = await sharingFriends(app);

    expect(await view.list(viewer.id)).toEqual([atTimetable(friend)]);
  });
});

describe('A common Party', () => {
  it('makes a Friend exact whose friendship switch is off, and lists no member who is no Friend', SLOW, async () => {
    const [[viewer, friend], stranger] = await Promise.all([sharingFriends(app), signInUser(app)]);
    await Promise.all([
      expectStatus(setMasterSwitch(app, stranger, true), 204),
      expectStatus(setFriendSharing(app, friend, viewer.id, false), 204),
      partyOfHolders(app, viewer, [friend, stranger]),
    ]);
    await Promise.all(
      [viewer, friend, stranger].map((member) => expectStatus(setPartySharing(app, member, true), 204)),
    );
    const uploaded = position();
    await Promise.all([
      expectStatus(uploadPosition(app, friend, uploaded), 200),
      expectStatus(uploadPosition(app, stranger, position()), 200),
    ]);

    expect(await view.list(viewer.id)).toEqual([
      { ...atTimetable(friend), level: 'exact', position: uploaded, placeId: await libraryPlaceId(viewer) },
    ]);
  });
});

describe('Every Friend', () => {
  it('is listed whatever their level, in the order of GET /friends', SLOW, async () => {
    const [[viewer, seen], hidden, without] = await Promise.all([
      sharingFriends(app),
      signInUser(app),
      signInUser(app),
    ]);
    await Promise.all([befriend(app, viewer, hidden), befriend(app, viewer, without)]);
    await Promise.all([
      expectStatus(setMasterSwitch(app, hidden, true), 204),
      expectStatus(setMasterSwitch(app, without, true), 204),
      expectStatus(uploadPosition(app, seen, position()), 200),
    ]);
    await expectStatus(uploadPosition(app, hidden, position()), 200);
    await expectStatus(setFriendSharing(app, hidden, viewer.id, false), 204);

    const listed = await view.list(viewer.id);

    const friends = z.array(z.object({ id: z.string() })).parse((await getFriends(app, viewer)).body);
    expect(listed.map(({ id }) => id)).toEqual(friends.map(({ id }) => id));
    expect(Object.fromEntries(listed.map(({ id, level }) => [id, level]))).toEqual({
      [seen.id]: 'exact',
      [hidden.id]: 'timetable',
      [without.id]: 'timetable',
    });
  });
});
