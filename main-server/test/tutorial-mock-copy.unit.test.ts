/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFile } from 'node:fs/promises';
import { readTutorialContent, TUTORIAL_FILE, type TutorialContent } from '../src/tutorial/tutorial-content.js';

// The app's mock serves the tutorial's icons and guides from a copy of content/tutorial.yaml (P15 ticket 53), which
// must not drift from the file: copy it again after a change, as mobile/src/api/mock/data/tutorial.ts says.

let content: TutorialContent;

beforeAll(async () => {
  content = await readTutorialContent(TUTORIAL_FILE);
});

describe("The app's mock copy of the guides", () => {
  it("holds every quest's icon and guide as the file does", async () => {
    const copy: unknown = JSON.parse(
      await readFile(new URL('../../mobile/src/api/mock/data/tutorial-guides.json', import.meta.url), 'utf8'),
    );

    expect(copy).toEqual(Object.fromEntries(content.quests.map(({ key, icon, guide }) => [key, { icon, guide }])));
  });
});
