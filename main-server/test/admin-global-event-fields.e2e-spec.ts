import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { createDraft, patchGlobalEvent, postGlobalEvent } from './global-event-changes.js';
import { getAdminGlobalEvents, getAdminGlobalEvent, listedEventSchema } from './global-event-lists.js';
import { place132 } from './quests.js';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

// The validation pipe starts each message with the path of the field, such as `title: `.
const refusalSchema = z.object({ message: z.array(z.string()) });

let app: INestApplication<Server>;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  ({ accessToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await app.close();
});

// Seoul City Hall, off campus.
const cityHall = { latitude: 37.5663, longitude: 126.9779 };

// Each broken rule, as a change to a valid body, with the field the message names.
const brokenRules: [string, object, string][] = [
  ['a blank title', { title: '   ' }, 'title'],
  ['a title longer than 200 characters', { title: 'a'.repeat(201) }, 'title'],
  ['a description that is not text', { description: 5 }, 'description'],
  ['a start without its offset', { startsAt: '2099-10-13T17:00:00' }, 'startsAt'],
  ['an end without its offset', { endsAt: '2099-10-13T19:00:00' }, 'endsAt'],
  ['an end at its start', { startsAt: '2099-10-13T17:00:00+09:00', endsAt: '2099-10-13T17:00:00+09:00' }, 'endsAt'],
  ['an end before its start', { startsAt: '2099-10-13T17:00:00+09:00', endsAt: '2099-10-13T16:00:00+09:00' }, 'endsAt'],
  ['a blank place', { place: '   ' }, 'place'],
  ['a place longer than 200 characters', { place: 'a'.repeat(201) }, 'place'],
  ['a latitude without a longitude', { latitude: place132.latitude }, 'latitude'],
  ['a longitude without a latitude', { longitude: place132.longitude }, 'latitude'],
  ['a latitude cleared alone', { latitude: null, longitude: place132.longitude }, 'latitude'],
  ['a position outside the Campus Boundary', cityHall, 'latitude'],
];

function messageOf(body: unknown): string | undefined {
  return refusalSchema.parse(body).message[0];
}

describe('Creating a Global Event with', () => {
  it.each([...brokenRules, ['no title', { title: undefined }, 'title'] as [string, object, string]])(
    '%s is refused with 400 naming the field, and stores nothing',
    async (_case, change, field) => {
      const marker = randomUUID();

      const response = await postGlobalEvent(app, accessToken, {
        title: `동아리 박람회 ${marker}`,
        description: '',
        ...change,
      });

      expect(response.status).toBe(400);
      expect(messageOf(response.body)).toMatch(new RegExp(`^${field}:`, 'u'));
      const drafts = z
        .array(listedEventSchema)
        .parse((await getAdminGlobalEvents(app, accessToken, { state: 'draft' })).body);
      expect(drafts.filter(({ title }) => title.includes(marker))).toEqual([]);
    },
  );

  it('a title and a place of 200 characters is accepted', async () => {
    const draft = await createDraft(app, accessToken, { title: 'a'.repeat(200), place: 'b'.repeat(200) });

    expect(draft).toMatchObject({ title: 'a'.repeat(200), place: 'b'.repeat(200) });
  });
});

describe('Editing a Global Event with', () => {
  it.each([...brokenRules, ['no version', { version: undefined }, 'version'] as [string, object, string]])(
    '%s is refused with 400 naming the field, and changes nothing',
    async (_case, change, field) => {
      const draft = await createDraft(app, accessToken);

      const response = await patchGlobalEvent(app, accessToken, draft.id, { version: draft.version, ...change });

      expect(response.status).toBe(400);
      expect(messageOf(response.body)).toMatch(new RegExp(`^${field}:`, 'u'));
      expect((await getAdminGlobalEvent(app, accessToken, draft.id)).body).toEqual(draft);
    },
  );

  it.each([
    [
      'an end before the stored start',
      { startsAt: '2099-10-13T17:00:00+09:00' },
      { endsAt: '2099-10-13T16:00:00+09:00' },
    ],
    [
      'a start after the stored end',
      { startsAt: '2099-10-13T17:00:00+09:00', endsAt: '2099-10-13T19:00:00+09:00' },
      { startsAt: '2099-10-13T20:00:00+09:00' },
    ],
  ])('%s is refused with 400 naming the end, and changes nothing', async (_case, stored, change) => {
    const draft = await createDraft(app, accessToken, stored);

    const response = await patchGlobalEvent(app, accessToken, draft.id, { version: draft.version, ...change });

    expect(response.status).toBe(400);
    expect(messageOf(response.body)).toMatch(/^endsAt:/u);
    expect((await getAdminGlobalEvent(app, accessToken, draft.id)).body).toEqual(draft);
  });
});
