/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject } from 'vitest';
import { type TestUser } from './friends.js';
import { LibraryStage } from './library.js';
import { postTutorial, tutorialAfter } from './tutorial.js';

// getTutorial at the Assistant's endpoint, with the scripted model in the model's place: the tutorial's content from
// tutorial.yaml and the User's progress, read without changing it.

const stage = new LibraryStage();
let user: TestUser;

beforeAll(async () => {
  await stage.start(inject('settings'));
  user = await stage.user('튜토리얼학생');
});

afterAll(() => stage.stop());

describe('getTutorial', () => {
  it("answers every quest's content and the User's status, without turning the tutorial on", async () => {
    expect(await stage.result(user, { tool: 'getTutorial', input: {} })).toEqual({
      result: 'found',
      state: 'off',
      total: 5,
      quests: ['s-card', 'admin-shuttle', 'kwanjeong', 'health-clinic', 'art-museum'].map(
        (key) => expect.objectContaining({ key, status: 'notStarted' }) as unknown,
      ),
    });
    expect(
      await tutorialAfter(postTutorial(stage.app, user, 'quests/s-card/complete', { by: 'button' })),
    ).toMatchObject({
      state: 'off',
    });
  });

  it("answers one quest with its places and links, and the User's progress", async () => {
    await tutorialAfter(postTutorial(stage.app, user, 'enable'));
    await tutorialAfter(postTutorial(stage.app, user, 'quests/health-clinic/start'));

    expect(await stage.result(user, { tool: 'getTutorial', input: { questKey: 'health-clinic' } })).toEqual({
      result: 'found',
      state: 'active',
      total: 5,
      quests: [
        {
          key: 'health-clinic',
          order: 4,
          title: '서울대 보건진료소 이용',
          brief: expect.any(String) as unknown,
          body: [expect.stringContaining('학생회관(63동) 3–4층') as unknown],
          condition: expect.any(String) as unknown,
          places: [{ place: '63', floor: 3 }],
          links: expect.arrayContaining([
            expect.objectContaining({ url: 'https://health4u.snu.ac.kr/index.do' }),
          ]) as unknown,
          facts: expect.arrayContaining([
            expect.objectContaining({ text: expect.stringContaining('02-880-5338') as unknown, checked: '2026-11-02' }),
          ]) as unknown,
          status: 'started',
        },
      ],
    });
    expect(await stage.result(user, { tool: 'getTutorial', input: { questKey: 's-card' } })).toMatchObject({
      quests: [{ key: 's-card', status: 'completed' }],
    });
  });
});

describe('getTutorial refusing', () => {
  it('answers none for a quest the tutorial does not have, naming those it has', async () => {
    expect(await stage.result(user, { tool: 'getTutorial', input: { questKey: 'dormitory' } })).toEqual({
      result: 'none',
      reason: expect.stringContaining('s-card, admin-shuttle, kwanjeong, health-clinic, art-museum') as unknown,
    });
  });

  it('answers whatever the app can show', async () => {
    expect(await stage.result(user, { tool: 'getTutorial', input: {} }, {})).toMatchObject({ result: 'found' });
  });
});
