import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { getProfile, patchProfile } from './profile.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';

// The validation pipe starts each message with the path of the field, such as `name: ` or `hashtags.0: `.
const refusalSchema = z.object({ message: z.array(z.string()) });

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

describe('Editing the profile with an invalid value', () => {
  it.each([
    ['an empty name', { name: '' }],
    ['a blank name', { name: '   ' }],
    ['a name longer than 30 characters', { name: 'a'.repeat(31) }],
    ['no name', { name: null }],
    ['an empty department', { department: '' }],
    ['a blank department', { department: '   ' }],
    ['a department longer than 50 characters', { department: 'a'.repeat(51) }],
    ['a department that is not text', { department: 5 }],
    ['no department', { department: null }],
    ['an admission year before 1946, when SNU was founded', { admissionYear: 1945 }],
    ['an admission year that is not a whole number', { admissionYear: 2020.5 }],
    ['an admission year sent as text', { admissionYear: '2020' }],
    ['more than 20 hashtags', { hashtags: Array.from({ length: 21 }, (_, index) => `tag${index}`) }],
    ['a hashtag longer than 30 characters', { hashtags: ['a'.repeat(31)] }],
    ['an empty hashtag', { hashtags: [''] }],
    ['a hashtag that is only #', { hashtags: ['#'] }],
    ['a hashtag with a space inside', { hashtags: ['board game'] }],
    ['a hashtag with a full-width space inside', { hashtags: ['보드\u3000게임'] }],
    ['the same hashtag twice', { hashtags: ['AI', 'AI'] }],
    ['the same hashtag twice once the spaces around are dropped', { hashtags: ['AI', ' AI '] }],
    ['the same hashtag twice once # is dropped', { hashtags: ['AI', '#AI'] }],
    ['the same hashtag twice in another case', { hashtags: ['AI', 'ai'] }],
    ['hashtags that are not a list', { hashtags: null }],
  ])('refuses %s with 400, names the field and changes nothing', async (_case, body) => {
    const { accessToken } = await signIn(app);
    const before: unknown = (await getProfile(app, accessToken)).body;

    const response = await patchProfile(app, accessToken, body);

    expect(response.status).toBe(400);
    expect(refusalSchema.parse(response.body).message[0]).toMatch(new RegExp(`^${Object.keys(body).join()}[.:]`, 'u'));
    expect((await getProfile(app, accessToken)).body).toEqual(before);
  });
});

describe('Editing the profile with a value at a limit', () => {
  it('accepts it', async () => {
    const { accessToken } = await signIn(app);
    const edited = {
      name: 'a'.repeat(30),
      department: 'a'.repeat(50),
      admissionYear: 1946,
      hashtags: Array.from({ length: 20 }, (_, index) => `${index}`.padStart(30, 'a')),
    };

    const response = await patchProfile(app, accessToken, edited);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(edited);
  });
});

describe('A hashtag', () => {
  it('may hold symbols', async () => {
    const { accessToken } = await signIn(app);

    const response = await patchProfile(app, accessToken, { hashtags: ['C++', 'R&B'] });

    expect(response.body).toMatchObject({ hashtags: ['C++', 'R&B'] });
  });

  it('is saved without the # in front, in the case it was sent', async () => {
    const { accessToken } = await signIn(app);

    const response = await patchProfile(app, accessToken, {
      hashtags: ['#AI', '##보드게임', 'C#', `#${'a'.repeat(30)}`],
    });

    expect(response.body).toMatchObject({ hashtags: ['AI', '보드게임', 'C#', 'a'.repeat(30)] });
  });
});

describe('The admission year', () => {
  it('can be this year in Korea but not the next', async () => {
    // Korea keeps UTC+9 all year.
    const thisYear = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();
    const { accessToken } = await signIn(app);

    expect((await patchProfile(app, accessToken, { admissionYear: thisYear })).status).toBe(200);
    expect((await patchProfile(app, accessToken, { admissionYear: thisYear + 1 })).status).toBe(400);
  });
});
