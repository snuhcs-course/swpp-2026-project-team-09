/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { seedHe } from '../src/he/he.seed.js';
import { HeStage } from './he-seed.js';

// The HE seed run after keys already signed in, as happened on swpp-a: a sign-in by key makes a User the seed did not
// write, with the key as its Google subject.

const stage = new HeStage();

beforeAll(() => stage.prepare());

afterAll(() => stage.stop());

describe('After keys signed in before it', () => {
  it('stops, naming the keys, and writes nothing', async () => {
    const responses = await Promise.all(['he-s2', 'he-s1'].map((key) => stage.signIn(key)));
    expect(responses.map(({ status }) => status)).toStrictEqual([200, 200]);
    const counts = await stage.rowCounts();

    await expect(seedHe(stage.prisma)).rejects.toThrow(/\bhe-s1, he-s2 signed in before the seed\b/u);

    expect(await stage.rowCounts()).toStrictEqual(counts);
  });
});
