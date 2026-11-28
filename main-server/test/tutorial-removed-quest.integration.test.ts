/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser } from './friends.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import {
  ADDED_QUEST,
  changedTutorialFile,
  completeAll,
  getTutorial,
  postTutorial,
  QUEST_KEYS,
  tutorialAfter,
} from './tutorial.js';
import { refuseKakao } from './walking-route.js';

// The tutorial's state against the main server with content/tutorial.yaml, for a User whose progress was made under
// a content with one more quest: the started rows of a key no longer in the content count for nothing.

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

// A second quest the content had then, as P06 ticket 60 took out three.
const ALSO_REMOVED = { ...ADDED_QUEST, key: 'student-union-again', order: 14 };

// P06 ticket 60 took three quests out of the content. A User who had completed every other quest, and not all of
// those, never got a finish from a completion; rows of keys no longer in the content count for nothing.
describe('A User who completed every quest of the content but not those taken out of it later', () => {
  it.each([
    ['started one of them', ['start']],
    ['completed one and started the other', ['complete', 'start']],
  ] as const)(
    'is finished once they %s, and stays finished on 진행하기',
    async (_, ways) => {
      const file = await changedTutorialFile({ extra: [ADDED_QUEST, ALSO_REMOVED] });
      const before = await startApp(
        inject('settings'),
        [],
        refuseKakao,
        new ScriptedModel().model,
        [],
        undefined,
        file,
      );
      const user = await signInUser(before);
      try {
        await tutorialAfter(postTutorial(before, user, 'enable'));
        const removed = [ADDED_QUEST.key, ALSO_REMOVED.key];
        for (const [at, way] of ways.entries()) {
          const path = `quests/${removed[at] ?? ''}/${way}`;
          // oxlint-disable-next-line no-await-in-loop -- one after another, as the User would
          await tutorialAfter(postTutorial(before, user, path, way === 'complete' ? { by: 'button' } : undefined));
        }
        const twelve = await completeAll(before, user);
        expect(twelve.state).toBe('active');
      } finally {
        await before.close();
      }

      const now = await tutorialAfter(getTutorial(app, user));

      expect(now.state).toBe('finished');
      expect(now.quests.map(({ key }) => key)).toEqual(QUEST_KEYS);
      expect((await tutorialAfter(postTutorial(app, user, 'enable'))).state).toBe('finished');
      // A second server started for the earlier content takes most of the time.
    },
    60_000,
  );
});
